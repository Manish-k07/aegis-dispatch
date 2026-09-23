#!/usr/bin/env bash
# ==============================================================================
# Aegis Dispatch CAD • Unix/macOS/Linux All-in-One Startup Script
# ==============================================================================

set -e
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "==================================================="
echo "🚀 Launching AEGIS DISPATCH Pro CAD..."
echo "==================================================="

# Check for Docker option
if command -v docker-compose &> /dev/null || docker compose version &> /dev/null; then
    read -p "Do you want to run with Docker Compose (recommended for production)? [y/N]: " USE_DOCKER
    if [[ "$USE_DOCKER" =~ ^[Yy]$ ]]; then
        echo "Starting via Docker Compose..."
        docker compose up -d
        echo "✓ Aegis Dispatch online at http://localhost:5173"
        exit 0
    fi
fi

# Native local execution
echo "Starting Backend in background..."
cd "$PROJECT_ROOT/backend"
if [ -f "./mvnw" ]; then
    ./mvnw spring-boot:run &
else
    mvn spring-boot:run &
fi
BACKEND_PID=$!

echo "Waiting for Backend to initialize..."
sleep 6

echo "Starting Frontend..."
cd "$PROJECT_ROOT/frontend"
npm run dev -- --host 0.0.0.0 &
FRONTEND_PID=$!

echo "==================================================="
echo "✓ Services active:"
echo "  Backend:  http://localhost:8080"
echo "  Frontend: http://localhost:5173"
echo "Press Ctrl+C to terminate all services."
echo "==================================================="

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit 0" SIGINT SIGTERM
wait
