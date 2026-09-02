package main

import (
	"context"
	"embed"
	"encoding/json"
	"io"
	"io/fs"
	"log"
	"net"
	"net/http"
	"os"
	"os/exec"
	"strings"
	"time"

	"github.com/webview/webview_go"
)

//go:embed frontend/dist
var frontendFS embed.FS

const (
	webviewTitle  = "Net Kit"
	webviewWidth  = 1200
	webviewHeight = 800
)

func main() {
	// Load embedded frontend (built by Vite).
	dist, err := fs.Sub(frontendFS, "frontend/dist")
	if err != nil {
		log.Fatalf("frontend not built: %v (run `npm run build` in frontend/)", err)
	}

	// Serve the UI over a localhost server so network features work
	// without browser CORS restrictions.
	listener, err := net.Listen("tcp", "127.0.0.1:41990")
	if err != nil {
		log.Fatalf("failed to open local server: %v", err)
	}

	mux := http.NewServeMux()
	mux.Handle("/", http.FileServer(http.FS(dist)))
	mux.HandleFunc("/api/scan", handleScan)
	mux.HandleFunc("/api/myip", handleMyIP)
	mux.HandleFunc("/api/theme", handleTheme)
	mux.HandleFunc("/api/ipinfo", handleIPInfo)
	mux.HandleFunc("/api/ipinfo/{ip}", handleIPInfoByIP)
	mux.HandleFunc("/api/asn/{id}", handleASN)
	mux.HandleFunc("/api/dns/{domain}", handleDNS)
	mux.HandleFunc("/api/whois/{domain}", handleWhois)

	server := &http.Server{Handler: mux}
	go func() {
		if err := server.Serve(listener); err != nil && err != http.ErrServerClosed {
			log.Printf("server error: %v", err)
		}
	}()

	apiAddr := "127.0.0.1:41990"
	log.Printf("serving UI at http://%s", apiAddr)

	openWebview(apiAddr)
}

// handleScan runs a LAN host-discovery scan and returns the found devices.
func handleScan(w http.ResponseWriter, r *http.Request) {
	res := runScan()
	writeJSON(w, res)
}

// handleMyIP returns the local (LAN) IP address and hostname of this machine.
func handleMyIP(w http.ResponseWriter, r *http.Request) {
	hostname, _ := os.Hostname()
	writeJSON(w, map[string]any{
		"ip":       localIP(),
		"hostname": hostname,
	})
}

const tridentBase = "https://api.tridentlab.in"

// handleIPInfo fetches the caller's public IP info over BOTH IPv4 and IPv6
// and returns them side by side. The API reports whichever address the request
// arrives on, so making one request per IP family yields info for each.
func handleIPInfo(w http.ResponseWriter, r *http.Request) {
	type result struct {
		ip   string
		data any
		err  error
	}
	results := make(chan result, 2)
	fetch := func(network string) {
		dialer := &net.Dialer{Timeout: 5 * time.Second}
		transport := &http.Transport{
			DialContext: func(ctx context.Context, _, addr string) (net.Conn, error) {
				return dialer.DialContext(ctx, network, addr) // "tcp4" or "tcp6"
			},
		}
		client := &http.Client{Transport: transport}
		resp, err := client.Get(tridentBase + "/ipinfo")
		if err != nil {
			results <- result{err: err}
			return
		}
		defer resp.Body.Close()
		var data any
		if err := json.NewDecoder(resp.Body).Decode(&data); err != nil {
			results <- result{err: err}
			return
		}
		results <- result{data: data}
	}

	go fetch("tcp4")
	go fetch("tcp6")

	out := map[string]any{
		"status": true,
		"ipv4":   map[string]any{"status": false},
		"ipv6":   map[string]any{"status": false},
	}
	for i := 0; i < 2; i++ {
		res := <-results
		if res.data == nil {
			continue
		}
		// Identify which family this result belongs to from the returned IP.
		m, ok := res.data.(map[string]any)
		if !ok {
			continue
		}
		ipStr, _ := m["ip"].(string)
		key := "ipv6"
		if strings.Contains(ipStr, ".") {
			key = "ipv4"
		}
		out[key] = m
	}
	writeJSON(w, out)
}

// handleIPInfoByIP proxies to tridentlab.in/ipinfo/{ip} for a specific IP
// address and returns its info.
func handleIPInfoByIP(w http.ResponseWriter, r *http.Request) {
	ip := r.PathValue("ip")
	if ip == "" {
		writeJSON(w, map[string]any{"status": false, "error": "missing ip"})
		return
	}
	proxyJSON(w, tridentBase+"/ipinfo/"+strings.TrimSpace(ip))
}

// handleASN proxies to tridentlab.in/asn/{id} for the given ASN number.
func handleASN(w http.ResponseWriter, r *http.Request) {
	asnID := r.PathValue("id")
	if asnID == "" {
		writeJSON(w, map[string]any{"status": false, "error": "missing asn id"})
		return
	}
	proxyJSON(w, tridentBase+"/asn/"+asnID)
}

// handleDNS proxies to tridentlab.in/dns/{domain} for the given domain.
func handleDNS(w http.ResponseWriter, r *http.Request) {
	domain := strings.TrimSpace(r.PathValue("domain"))
	if domain == "" {
		writeJSON(w, map[string]any{"status": false, "error": "missing domain"})
		return
	}
	proxyJSON(w, tridentBase+"/dns/"+domain)
}

// handleWhois proxies to tridentlab.in/whois/{domain} for the given domain.
func handleWhois(w http.ResponseWriter, r *http.Request) {
	domain := strings.TrimSpace(r.PathValue("domain"))
	if domain == "" {
		writeJSON(w, map[string]any{"status": false, "error": "missing domain"})
		return
	}
	proxyJSON(w, tridentBase+"/whois/"+domain)
}

// proxyJSON fetches a remote JSON endpoint and streams it to the client.
func proxyJSON(w http.ResponseWriter, url string) {
	resp, err := http.Get(url)
	if err != nil {
		w.WriteHeader(http.StatusBadGateway)
		writeJSON(w, map[string]any{"status": false, "error": err.Error()})
		return
	}
	defer resp.Body.Close()

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(resp.StatusCode)
	if _, err := io.Copy(w, resp.Body); err != nil {
		log.Printf("proxy copy error: %v", err)
	}
}

// handleTheme detects the system theme (dark/light) and returns it. If the
// theme cannot be determined, it defaults to "light".
func handleTheme(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, map[string]any{"theme": detectSystemTheme()})
}

func writeJSON(w http.ResponseWriter, v any) {
	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(v); err != nil {
		log.Printf("json encode error: %v", err)
	}
}

// localIP returns the primary outbound IPv4 address (the machine's LAN IP).
func localIP() string {
	conn, err := net.Dial("udp", "8.8.8.8:80")
	if err != nil {
		return ""
	}
	defer conn.Close()
	return conn.LocalAddr().(*net.UDPAddr).IP.String()
}

// detectSystemTheme queries the GTK color-scheme preference on Linux.
// Falls back to dark when the legacy theme name hints at it, else light.
func detectSystemTheme() string {
	if out, err := exec.Command("gsettings", "get", "org.gnome.desktop.interface", "color-scheme").Output(); err == nil {
		s := strings.ToLower(strings.TrimSpace(string(out)))
		if strings.Contains(s, "dark") {
			return "dark"
		}
		if strings.Contains(s, "light") {
			return "light"
		}
	}
	if out, err := exec.Command("gsettings", "get", "org.gnome.desktop.interface", "gtk-theme").Output(); err == nil {
		if strings.Contains(strings.ToLower(string(out)), "dark") {
			return "dark"
		}
	}
	return "dark"
}

// openWebview launches a native desktop window showing the UI.
func openWebview(url string) {
	// Workaround for "The URL can't be shown": WebKit's bubblewrap sandbox
	// fails to launch the web process in restricted/containerized
	// environments, so the page never renders. Disabling the hard sandbox
	// lets the WebKitWebProcess run. Best-effort; ignore errors.
	_ = os.Setenv("WEBKIT_DISABLE_SANDBOX_THIS_IS_DANGEROUS", "1")
	_ = os.Setenv("WEBKIT_FORCE_SANDBOX", "0")
	_ = os.Setenv("WEBKIT_DISABLE_COMPOSITING_MODE", "1")
	_ = os.Setenv("WEBKIT_DISABLE_DMABUF_RENDERER", "1")

	debug := os.Getenv("NETKIT_DEBUG") == "1"

	w := webview.New(debug)
	if w == nil {
		log.Fatalf("failed to create webview (missing GTK on Linux?)")
	}
	defer w.Destroy()

	w.SetTitle(webviewTitle)
	w.SetSize(webviewWidth, webviewHeight, webview.HintNone)
	w.Navigate(url)
	w.Run()
}
