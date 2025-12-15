#!/bin/bash

# Komplettes Rebuild-Script für das Frontend auf dem Server

set -e

echo "🔨 Baue Frontend komplett neu (ohne Cache)..."

cd /opt/medical-chatbot/Desktop/Arzt\ Chatbot/medical-chatbot

# Prüfe docker-compose.yml
echo "📄 Prüfe Backend-URL in docker-compose.yml..."
grep "VITE_BACKEND_URL" docker-compose.yml

# Stoppe Frontend
echo "🛑 Stoppe Frontend..."
docker compose stop frontend

# Entferne alten Container und Image
echo "🗑️  Entferne alten Frontend-Container..."
docker compose rm -f frontend || true

# Baue Frontend OHNE Cache neu
echo "📦 Baue Frontend neu (ohne Cache)..."
docker compose build --no-cache frontend

# Starte Frontend
echo "🚀 Starte Frontend..."
docker compose up -d frontend

# Warte kurz
sleep 5

# Prüfe Logs
echo "📋 Frontend-Logs:"
docker compose logs frontend | tail -20

echo ""
echo "✅ Frontend wurde erfolgreich neu gebaut!"
echo "🌐 Teste: https://chatbotcarsten.live"
echo "🔍 Prüfe Browser-Konsole für Backend-URL (sollte https://chatbotcarsten.live sein)"

