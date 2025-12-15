#!/bin/bash

# Script zum Deployen aller Frontend-Updates auf den Server

set -e

SERVER_USER="${SERVER_USER:-root}"
SERVER_HOST="${SERVER_HOST:-37.27.12.97}"
PROJECT_DIR="/opt/medical-chatbot/Desktop/Arzt Chatbot/medical-chatbot"

echo "🔧 Deploye Frontend-Updates..."
echo ""
echo "📋 Änderungen:"
echo "   - useChat.ts: QUICK_REPLY_LIBRARY erweitert um 'Beschwerden einschätzen'"
echo "   - responses.ts: Neue Response 'Fragebogen Beschwerden starten' hinzugefügt"
echo "   - responses.ts: DEFAULT_QUICK_REPLY_LABELS erweitert"
echo ""

# Kopiere geänderte Dateien auf den Server
echo "📤 Kopiere Dateien auf den Server..."
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

scp "${SCRIPT_DIR}/frontend/src/hooks/useChat.ts" ${SERVER_USER}@${SERVER_HOST}:"${PROJECT_DIR}/frontend/src/hooks/useChat.ts"
scp "${SCRIPT_DIR}/frontend/src/data/responses.ts" ${SERVER_USER}@${SERVER_HOST}:"${PROJECT_DIR}/frontend/src/data/responses.ts"

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
echo "   - Prüfe ob 'Beschwerden einschätzen' Quick Reply sichtbar ist"
echo ""
ENDSSH

echo ""
echo "✅ Frontend-Updates wurden deployed!"
echo ""

