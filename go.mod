module github.com/tridentlab/netkit

go 1.25.0

require github.com/webview/webview_go v0.0.0-20240831120633-6173450d4dd6

require (
	golang.org/x/net v0.58.0 // indirect
	golang.org/x/sys v0.47.0 // indirect
)

// This machine (Ubuntu 24.04) only ships webkit2gtk-4.1; the original
// webview_go hardcodes webkit2gtk-4.0. The Ghibranalj fork bumps the
// GTK/WebKit version to 4.1 so the binary builds against what is installed.
replace github.com/webview/webview_go => github.com/Ghibranalj/webview_go v0.0.0-20251019170756-f933bf214be3
