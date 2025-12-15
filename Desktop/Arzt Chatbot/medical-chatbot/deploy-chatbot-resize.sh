#!/bin/bash

# Script zum Deployen der ChatWidget postMessage-Änderungen auf den Server

set -e

SERVER_USER="${SERVER_USER:-root}"
SERVER_HOST="${SERVER_HOST:-37.27.12.97}"
PROJECT_DIR="/opt/medical-chatbot/Desktop/Arzt Chatbot/medical-chatbot"

echo "🔧 Deploye ChatWidget postMessage-Änderungen..."
echo ""
echo "📋 Änderungen:"
echo "   - ChatWidget.tsx: postMessage an Parent-Seite senden"
echo ""

# Kopiere geänderte Dateien auf den Server
echo "📤 Kopiere Dateien auf den Server..."
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
scp "${SCRIPT_DIR}/frontend/src/components/ChatWidget.tsx" ${SERVER_USER}@${SERVER_HOST}:${PROJECT_DIR}/frontend/src/components/ChatWidget.tsx

# Führe Deployment auf dem Server aus
echo ""
echo "🚀 Führe Deployment auf dem Server aus..."
ssh ${SERVER_USER}@${SERVER_HOST} << 'ENDSSH'
set -e
cd /opt/medical-chatbot/Desktop/Arzt\ Chatbot/medical-chatbot

echo "🔨 Rebuild Frontend..."
docker compose build --no-cache frontend

echo "🔄 Restart Frontend..."
docker compose restart frontend

echo ""
echo "✅ Deployment abgeschlossen!"
echo ""
echo "🧪 Teste die Konfiguration:"
echo "   - https://chatbotcarsten.live (direkt)"
echo "   - iframe auf Netlify-Seite einbetten"
echo "   - Prüfe Browser-Konsole auf postMessage-Events"
echo ""
ENDSSH

echo ""
echo "✅ Frontend-Änderungen wurden deployed!"
echo ""
echo "📝 Nächste Schritte:"
echo "   1. Deploye chatbot-resize.js, script.js und index.html auf Netlify"
echo "   2. Teste die iframe-Einbindung auf deiner Netlify-Seite"
echo "   3. Prüfe die Browser-Konsole auf postMessage-Events"
echo ""


