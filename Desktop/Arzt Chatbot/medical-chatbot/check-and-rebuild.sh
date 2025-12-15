#!/bin/bash

# Script zum Prüfen und vollständigen Neubau des Frontends

set -e

SERVER_USER="root"
SERVER_HOST="37.27.12.97"
PROJECT_DIR="/opt/medical-chatbot/Desktop/Arzt Chatbot/medical-chatbot"

echo "🔍 Prüfe Dateien auf dem Server..."
echo ""

ssh ${SERVER_USER}@${SERVER_HOST} << 'ENDSSH'
set -e
cd /opt/medical-chatbot/Desktop/Arzt\ Chatbot/medical-chatbot

echo "📋 Prüfe ob Dateien vorhanden sind:"
echo ""
ls -lh frontend/src/hooks/useChat.ts
echo ""
ls -lh frontend/src/data/responses.ts
echo ""

echo "🔍 Prüfe ob 'Beschwerden einschätzen' in useChat.ts vorhanden ist:"
grep -n "Beschwerden einschätzen" frontend/src/hooks/useChat.ts || echo "❌ Nicht gefunden!"
echo ""

echo "🔍 Prüfe ob 'fragebogen beschwerden starten' in responses.ts vorhanden ist:"
grep -n "fragebogen beschwerden starten" frontend/src/data/responses.ts || echo "❌ Nicht gefunden!"
echo ""

echo "🛑 Stoppe Frontend-Container..."
docker compose stop frontend

echo "🗑️  Entferne alten Frontend-Container und Image..."
docker compose rm -f frontend || true
docker rmi medical-chatbot-frontend || true

echo "🔨 Baue Frontend komplett neu (ohne Cache)..."
docker compose build --no-cache --pull frontend

echo "🚀 Starte Frontend neu..."
docker compose up -d frontend

echo ""
echo "⏳ Warte 5 Sekunden..."
sleep 5

echo ""
echo "📊 Container-Status:"
docker compose ps frontend

echo ""
echo "📋 Frontend-Logs (letzte 20 Zeilen):"
docker compose logs frontend --tail 20

echo ""
echo "✅ Frontend wurde neu gebaut und gestartet!"
echo ""
echo "🧪 Teste jetzt:"
echo "   - https://chatbotcarsten.live"
echo "   - Browser-Cache leeren (Cmd+Shift+R oder Ctrl+Shift+R)"
echo ""
ENDSSH

echo ""
echo "✅ Prüfung und Rebuild abgeschlossen!"
echo ""

