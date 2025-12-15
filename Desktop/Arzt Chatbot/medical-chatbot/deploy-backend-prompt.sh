#!/bin/bash

# Script zum Deployen des aktualisierten System Prompts auf den Server

set -e

SERVER_USER="root"
SERVER_HOST="37.27.12.97"
PROJECT_DIR="/opt/medical-chatbot/Desktop/Arzt Chatbot/medical-chatbot"

echo "🔧 Deploye aktualisierten System Prompt..."
echo ""
echo "📋 Änderungen:"
echo "   - Mehrsprachigkeit hinzugefügt"
echo "   - Medizinischer Beschwerde-Fragebogen integriert"
echo "   - Erweiterte Notfall- und Sicherheitslogik"
echo "   - Dringlichkeitseinschätzung am Ende des Fragebogens"
echo ""

cd "$(dirname "$0")"

echo "📤 Upload openai_service.py..."
scp backend/services/openai_service.py ${SERVER_USER}@${SERVER_HOST}:"${PROJECT_DIR}/backend/services/openai_service.py"

echo ""
echo "🚀 Backend neu bauen und starten..."
ssh ${SERVER_USER}@${SERVER_HOST} << 'ENDSSH'
set -e
cd /opt/medical-chatbot/Desktop/Arzt\ Chatbot/medical-chatbot

echo "🔨 Rebuild Backend..."
docker compose build --no-cache backend

echo "🔄 Restart Backend..."
docker compose restart backend

echo ""
echo "⏳ Warte 5 Sekunden..."
sleep 5

echo ""
echo "📊 Container-Status:"
docker compose ps backend

echo ""
echo "📋 Backend-Logs (letzte 20 Zeilen):"
docker compose logs backend --tail 20

echo ""
echo "✅ Backend wurde aktualisiert und neu gestartet!"
echo ""
ENDSSH

echo ""
echo "✅ System Prompt wurde erfolgreich deployed!"
echo ""

