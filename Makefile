BIN := bin/netkit

.PHONY: all build frontend run clean

all: build

# Build the embedded frontend, then the Go binary.
build:
	cd frontend && npm run build
	go build -o $(BIN) .

# Build the frontend only (produces frontend/dist).
frontend:
	cd frontend && npm run build

# Build and run.
run: build
	./$(BIN)

# Remove build artifacts.
clean:
	rm -rf frontend/dist $(BIN)
