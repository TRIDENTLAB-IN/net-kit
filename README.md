# NetKit

A cross-platform network tools desktop app.

- **Backend**: Go — serves the UI over a localhost HTTP server and launches a native webview window.
- **Frontend**: Vite + React — built to `frontend/dist` and embedded into the Go binary at build time.

## Prerequisites (Linux)
- Go 1.22+
- Node.js + npm (for the frontend build)
- System dev packages for the webview: `libgtk-3-dev` and `libwebkit2gtk-4.0-dev`

> On this machine only `webkit2gtk-4.1` is installed. To build locally you must
> install the matching dev package yourself (the agent will not modify system
> packages). See `AGENTS.md`.

## Rebuild
```bash
cd frontend && npm install && npm run build
cd ..
go build -o bin/netkit .
./bin/netkit
```

## Dev (hot reload UI)
```bash
cd frontend && npm run dev   # Vite dev server at http://localhost:5173
```
