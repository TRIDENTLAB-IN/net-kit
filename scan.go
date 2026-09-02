package main

import (
	"fmt"
	"net"
	"os/exec"
	"strings"
	"sync"
	"time"
)

// Device is a representation of a host discovered on the local network.
type Device struct {
	IP       string   `json:"ip"`
	MAC      string   `json:"mac,omitempty"`
	Vendor   string   `json:"vendor,omitempty"`
	Hostname string   `json:"hostname,omitempty"`
	Type     string   `json:"type,omitempty"`
	Ports    []int    `json:"ports,omitempty"`
	Online   bool     `json:"online"`
}

// ScanResult is what the /api/scan endpoint returns.
type ScanResult struct {
	Status   string   `json:"status"`
	Subnet   string   `json:"subnet"`
	DeviceIP string   `json:"device_ip"`
	Gateway  string   `json:"gateway,omitempty"`
	Hosts    []Device `json:"hosts"`
	Elapsed  float64  `json:"elapsed_seconds"`
}

// scanCommonPorts are the ports probed during the host sweep to trigger ARP
// resolution on a LAN. Any TCP connect attempt (even to a closed port) makes
// the kernel ARP for the target, which marks live hosts in `ip neigh`.
var scanCommonPorts = []int{80, 443, 22, 445, 53, 8080}

// detectNetwork finds the active LAN: the interface with the default route.
// Returns the CIDR subnet, the machine's IP on it, and the default gateway.
func detectNetwork() (subnet string, deviceIP string, gateway string) {
	gw := ""
	// Find the default route interface.
	routeOut, err := exec.Command("ip", "-4", "route").Output()
	if err != nil {
		return "", "", ""
	}
	dev := ""
	for _, line := range strings.Split(string(routeOut), "\n") {
		f := strings.Fields(line)
		if len(f) >= 3 && f[0] == "default" {
			if strings.Contains(line, "dev ") {
				for i := 0; i < len(f); i++ {
					if f[i] == "dev" && i+1 < len(f) {
						dev = f[i+1]
					}
					if f[i] == "via" && i+1 < len(f) {
						gw = f[i+1]
					}
				}
			}
			break
		}
	}
	if dev == "" {
		return "", "", ""
	}

	// Find this machine's IPv4 and prefix on that interface.
	addrOut, err := exec.Command("ip", "-4", "addr", "show", "dev", dev).Output()
	if err != nil {
		return "", "", ""
	}
	for _, line := range strings.Split(string(addrOut), "\n") {
		f := strings.Fields(line)
		for i := 0; i < len(f); i++ {
			if f[i] == "inet" && i+1 < len(f) {
				cidr := f[i+1]
				ip, ipnet, err := net.ParseCIDR(cidr)
				if err == nil {
					return ipnet.String(), ip.String(), gw
				}
			}
		}
	}
	return "", "", gw
}

// scanHosts runs a TCP connect sweep across the subnet and returns the list of
// live hosts. After the sweep, `ip neigh` holds an entry for each reachable
// host with its MAC address.
func scanHosts(subnet string) []net.IP {
	_, ipnet, err := net.ParseCIDR(subnet)
	if err != nil || ipnet == nil {
		return nil
	}
	var wg sync.WaitGroup
	var mu sync.Mutex
	live := make([]net.IP, 0)
	dialTimeout := 350 * time.Millisecond

	network := ipnet.IP.Mask(ipnet.Mask)
	broadcast := make(net.IP, 4)
	for i := 0; i < 4; i++ {
		broadcast[i] = network[i] | ^ipnet.Mask[i]
	}

	// Iterate .1 .. .254 (skip network address .0 and broadcast .255).
	ip4 := cloneIP(network)
	incIP(ip4)
	for {
		cur := cloneIP(ip4)
		if cur.Equal(broadcast) {
			break
		}
		host := cur.String()
		wg.Add(1)
		go func(h string) {
			defer wg.Done()
			for _, port := range scanCommonPorts {
				addr := net.JoinHostPort(h, fmt.Sprintf("%d", port))
				conn, err := net.DialTimeout("tcp", addr, dialTimeout)
				if err == nil {
					conn.Close()
					mu.Lock()
					live = append(live, net.ParseIP(h))
					mu.Unlock()
					return
				}
			}
		}(host)
		incIP(ip4)
	}
	wg.Wait()
	return live
}

// macForIP returns the MAC address for an IP from the kernel ARP table.
func macForIP(ip string) string {
	out, err := exec.Command("ip", "-4", "neigh", "show", ip).Output()
	if err != nil {
		return ""
	}
	for _, line := range strings.Split(string(out), "\n") {
		f := strings.Fields(line)
		for i := 0; i < len(f); i++ {
			if f[i] == "lladdr" && i+1 < len(f) {
				return f[i+1]
			}
		}
	}
	return ""
}

// hostnameForIP attempts a reverse DNS lookup for the given IP.
func hostnameForIP(ip string) string {
	names, err := net.LookupAddr(ip)
	if err != nil || len(names) == 0 {
		return ""
	}
	return strings.TrimSuffix(names[0], ".")
}

// ouiLookup returns a short vendor name for a MAC address OUI prefix.
// The table covers common consumer/networking manufacturers; unknown OUIs
// yield an empty string and the full MAC is shown instead.
func ouiLookup(mac string) string {
	trimmed := strings.TrimSpace(mac)
	if len(trimmed) < 8 {
		return ""
	}
	// MAC format is "aa:bb:cc:dd:ee:ff" → OUI is the first 8 chars (aa:bb:cc).
	oui := strings.ToUpper(trimmed[:8])
	switch oui {
	case "08:4F:66":
		return "ZTE"
	case "00:1A:2B":
		return "D-Link"
	case "3C:8D:20":
		return "Ruijie Networks"
	case "B0:2E:BA":
		return "Xiaomi"
	case "CC:2D:E0":
		return "TP-Link"
	case "50:10:D8":
		return "Huawei"
	case "8C:85:90":
		return "Shenzhen Botech"
	case "4C:D9:8F":
		return "Lite-On"
	}
	return ""
}

// classifyDevice returns a best-effort device type label.
func classifyDevice(ip, gateway, mac string) string {
	if mac == "" {
		return "Unknown"
	}
	if ip == gateway {
		return "Router/Gateway"
	}
	return "Device"
}

func cloneIP(ip net.IP) net.IP {
	c := make(net.IP, len(ip))
	copy(c, ip)
	return c
}

func incIP(ip net.IP) {
	for j := len(ip) - 1; j >= 0; j-- {
		ip[j]++
		if ip[j] > 0 {
			break
		}
	}
}

// runScan performs the full network scan and returns a populated ScanResult.
func runScan() ScanResult {
	start := time.Now()
	subnet, deviceIP, gateway := detectNetwork()
	res := ScanResult{
		Status:   "ok",
		Subnet:   subnet,
		DeviceIP: deviceIP,
		Gateway:  gateway,
		Hosts:    []Device{},
	}

	if subnet == "" || deviceIP == "" {
		res.Status = "no_active_network"
		return res
	}

	live := scanHosts(subnet)
	sortIps(live)

	for _, ip := range live {
		ipStr := ip.String()
		if ipStr == deviceIP {
			continue // skip ourselves
		}
		mac := macForIP(ipStr)
		vendor := ouiLookup(mac)
		d := Device{
			IP:       ipStr,
			MAC:      mac,
			Vendor:   vendor,
			Hostname: hostnameForIP(ipStr),
			Type:     classifyDevice(ipStr, gateway, mac),
			Online:   true,
		}
		res.Hosts = append(res.Hosts, d)
	}

	res.Elapsed = time.Since(start).Seconds()
	return res
}

func sortIps(ips []net.IP) {
	// simple insertion sort on the 4th octet for readability
	for i := 1; i < len(ips); i++ {
		for j := i; j > 0 && compareIP(ips[j], ips[j-1]) < 0; j-- {
			ips[j], ips[j-1] = ips[j-1], ips[j]
		}
	}
}

func compareIP(a, b net.IP) int {
	aa, bb := a.To4(), b.To4()
	for i := 0; i < 4; i++ {
		if aa[i] < bb[i] {
			return -1
		}
		if aa[i] > bb[i] {
			return 1
		}
	}
	return 0
}
