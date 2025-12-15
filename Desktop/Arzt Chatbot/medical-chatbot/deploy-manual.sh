#!/bin/bash

# Manuelles Deployment-Script
# Führe diese Befehle manuell aus und gib das Passwort ein, wenn es abgefragt wird

set -e

SERVER_USER="root"
SERVER_HOST="37.27.12.97"
PROJECT_DIR="/opt/medical-chatbot/Desktop/Arzt Chatbot/medical-chatbot"

echo "🔧 Manuelles Deployment der Frontend-Updates"
echo ""
echo "📋 Diese Befehle werden ausgeführt:"
echo "   1. Upload useChat.ts"
echo "   2. Upload responses.ts"
echo "   3. Frontend neu bauen"
echo "   4. Frontend neu starten"
echo ""
echo "⚠️  Du wirst nach dem SSH-Passwort gefragt (2x für scp, 1x für ssh)"
echo ""

cd "$(dirname "$0")"

echo "📤 Schritt 1: Upload useChat.ts..."
scp frontend/src/hooks/useChat.ts ${SERVER_USER}@${SERVER_HOST}:"${PROJECT_DIR}/frontend/src/hooks/useChat.ts"

echo ""
echo "📤 Schritt 2: Upload responses.ts..."
scp frontend/src/data/responses.ts ${SERVER_USER}@${SERVER_HOST}:"${PROJECT_DIR}/frontend/src/data/responses.ts"

echo ""
echo "🚀 Schritt 3 & 4: Frontend neu bauen und starten..."
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
echo "✅ Alle Schritte erfolgreich abgeschlossen!"
echo ""

