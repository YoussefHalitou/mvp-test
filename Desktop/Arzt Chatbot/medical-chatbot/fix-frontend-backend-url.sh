#!/bin/bash

# Script zum Prüfen und Fixen der Backend-URL im Frontend

echo "🔍 Prüfe Backend-URL-Konfiguration..."

# Prüfe docker-compose.yml
echo ""
echo "📄 docker-compose.yml:"
grep -A 3 "VITE_BACKEND_URL" docker-compose.yml

echo ""
echo "🔨 Baue Frontend neu (ohne Cache)..."
echo "Führe auf dem Server aus:"
echo ""
echo "cd /opt/medical-chatbot/Desktop/Arzt\ Chatbot/medical-chatbot"
echo "docker compose build --no-cache frontend"
echo "docker compose up -d frontend"
echo ""

