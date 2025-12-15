#!/bin/bash

# Script zum Kopieren der Frontend-Änderungen auf den Server und Neubauen

set -e

SERVER="root@37.27.12.97"
SERVER_PATH="/opt/medical-chatbot/Desktop/Arzt Chatbot/medical-chatbot"

echo "📤 Kopiere geänderte Dateien auf den Server..."

# Kopiere Dateien
scp docker-compose.yml $SERVER:$SERVER_PATH/
scp frontend/src/services/api.ts $SERVER:$SERVER_PATH/frontend/src/services/
scp frontend/src/App.tsx $SERVER:$SERVER_PATH/frontend/src/
scp frontend/src/index.css $SERVER:$SERVER_PATH/frontend/src/
scp frontend/index.html $SERVER:$SERVER_PATH/frontend/

echo "✅ Dateien kopiert!"
echo ""
echo "🔨 Baue Frontend auf dem Server neu..."

# Baue Frontend auf dem Server neu
ssh $SERVER "cd $SERVER_PATH && docker compose build frontend && docker compose restart frontend"

echo ""
echo "✅ Frontend wurde erfolgreich neu gebaut und deployed!"
echo "🌐 Teste jetzt: https://chatbotcarsten.live"

