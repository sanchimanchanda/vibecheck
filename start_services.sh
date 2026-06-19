#!/bin/bash

echo "Starting VibeCheck Services..."
echo ""

echo "🐍 Starting Python Flask Scanner Service..."
python3 scanner_service.py &
FLASK_PID=$!

# Check if Flask service started successfully
sleep 2
if ! kill -0 $FLASK_PID 2>/dev/null; then
    echo "❌ Failed to start Flask service"
    exit 1
fi

echo "⏳ Waiting for Flask service to start..."
sleep 3

echo "🌐 Starting Next.js Frontend..."
npm run dev &
NEXTJS_PID=$!

# Check if Next.js service started successfully
sleep 2
if ! kill -0 $NEXTJS_PID 2>/dev/null; then
    echo "❌ Failed to start Next.js service"
    kill $FLASK_PID 2>/dev/null
    exit 1
fi

echo ""
echo "✅ Both services are running!"
echo ""
echo "📡 Flask Scanner Service: http://127.0.0.1:5000"
echo "🌐 Next.js Frontend: http://localhost:3000"
echo ""
echo "Press Ctrl+C to stop all services..."

# Function to cleanup background processes
cleanup() {
    echo ""
    echo "🛑 Stopping services..."
    kill $FLASK_PID 2>/dev/null
    kill $NEXTJS_PID 2>/dev/null
    echo "✅ Services stopped."
    exit 0
}

# Set trap to cleanup on script exit
trap cleanup SIGINT SIGTERM

# Wait for user to stop services
wait