#!/bin/bash

# Start ngrok tunnels for development with HTTPS
echo "🚀 Starting ngrok tunnels..."

# Start frontend tunnel (port 5175)
echo "📱 Starting frontend tunnel on port 5175..."
ngrok http 5175 --log=stdout > /tmp/ngrok-frontend.log &
FRONTEND_PID=$!

# Wait a bit for ngrok to start
sleep 3

# Start backend tunnel (port 5001)
echo "🔧 Starting backend tunnel on port 5001..."
ngrok http 5001 --log=stdout > /tmp/ngrok-backend.log &
BACKEND_PID=$!

# Wait for tunnels to be ready
sleep 3

# Get the public URLs
echo ""
echo "✅ Tunnels started!"
echo ""
echo "📋 Your public URLs:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Get frontend URL
FRONTEND_URL=$(curl -s http://localhost:4040/api/tunnels | grep -o '"public_url":"https://[^"]*' | grep -o 'https://[^"]*' | head -1)
echo "Frontend: $FRONTEND_URL"

# Get backend URL
BACKEND_URL=$(curl -s http://localhost:4041/api/tunnels | grep -o '"public_url":"https://[^"]*' | grep -o 'https://[^"]*' | head -1)
echo "Backend:  $BACKEND_URL"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📝 Add these to your Slack app settings:"
echo "Redirect URL: $FRONTEND_URL/auth/integration/callback"
echo ""
echo "🔐 Update your backend/.env:"
echo "FRONTEND_URL=$FRONTEND_URL"
echo ""
echo "Press Ctrl+C to stop tunnels"
echo ""

# Keep script running
wait
