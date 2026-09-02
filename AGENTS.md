# NetKit — Agent Instructions

## Hard rules
- Do NOT install, update, upgrade, or modify any system packages or the system
  package manager (no `sudo apt-get install/upgrade`, no `apt`, `dpkg`, `pacman`,
  `dnf`, etc.). Never alter system-level config, headers, or libraries.
- Do NOT modify anything outside this repository unless explicitly asked.
- If a build step needs a missing system dependency (e.g. webkit2gtk dev
  headers), STOP and tell the user what to run themselves — do not attempt to
  install it.

## Project layout
- Go backend: `main.go` (module `github.com/tridentlab/netkit`), embeds the
  built frontend via `//go:embed frontend/dist` and serves it over a localhost
  HTTP server, then opens a native webview.
- Frontend: `frontend/` — Vite + React. `npm install` + `npm run build` in
  `frontend/` produces `frontend/dist`, which Go embeds at build time.

## Rebuild workflow
1. `cd frontend && npm run build`
2. `go build -o bin/netkit .`

## Notes
- Ubuntu 24.04 ships **webkit2gtk-4.1**, not 4.0. The Go webview library
  (`github.com/webview/webview_go`) is redirected in `go.mod` via a `replace`
  directive to the `Ghibranalj/webview_go` fork, which targets webkit2gtk-4.1
  and builds against the installed dev headers. Do not remove that `replace`
  unless the upstream lib gains built-in 4.1 support.
- Required system dev packages (preinstalled): `libgtk-3-dev`,
  `libwebkit2gtk-4.1-dev`.
