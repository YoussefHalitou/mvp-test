#!/bin/bash

# Script zum Prüfen der Deployment-Status und Leeren von Caches

set -e

SERVER_USER="root"
SERVER_HOST="37.27.12.97"
PROJECT_DIR="/opt/medical-chatbot/Desktop/Arzt Chatbot/medical-chatbot"

echo "🔍 Prüfe Deployment-Status und leere Caches..."
echo ""

ssh ${SERVER_USER}@${SERVER_HOST} << 'ENDSSH'
set -e
cd /opt/medical-chatbot/Desktop/Arzt\ Chatbot/medical-chatbot

echo "📋 Prüfe ob neue Dateien auf dem Server sind:"
echo ""
echo "1. useChat.ts - 'Beschwerden einschätzen':"
grep -n "Beschwerden einschätzen" frontend/src/hooks/useChat.ts | head -1 || echo "❌ Nicht gefunden!"
echo ""

echo "2. responses.ts - 'fragebogen beschwerden starten':"
grep -n "fragebogen beschwerden starten" frontend/src/data/responses.ts | head -1 || echo "❌ Nicht gefunden!"
echo ""

echo "3. openai_service.py - 'MEDIZINISCHER BESCHWERDE-FRAGEBOGEN':"
grep -n "MEDIZINISCHER BESCHWERDE-FRAGEBOGEN" backend/services/openai_service.py | head -1 || echo "❌ Nicht gefunden!"
echo ""

echo "🛑 Stoppe alle Container..."
docker compose stop frontend backend

echo ""
echo "🗑️  Entferne Frontend-Container und Image komplett..."
docker compose rm -f frontend || true
docker rmi medical-chatbot-frontend || true

echo ""
echo "🗑️  Entferne Backend-Container und Image komplett..."
docker compose rm -f backend || true
docker rmi medical-chatbot-backend || true

echo ""
echo "🔨 Baue Frontend komplett neu (ohne Cache)..."
docker compose build --no-cache --pull frontend

echo ""
echo "🔨 Baue Backend komplett neu (ohne Cache)..."
docker compose build --no-cache --pull backend

echo ""
echo "🚀 Starte alle Container neu..."
docker compose up -d

echo ""
echo "⏳ Warte 10 Sekunden..."
sleep 10

echo ""
echo "📊 Container-Status:"
docker compose ps

echo ""
echo "🧹 Leere Nginx-Cache (falls vorhanden)..."
docker compose exec frontend rm -rf /var/cache/nginx/* 2>/dev/null || echo "Kein Nginx-Cache gefunden"
docker compose exec frontend nginx -s reload 2>/dev/null || echo "Nginx reload nicht möglich"

echo ""
echo "📋 Prüfe Frontend-Build (sollte neue Assets haben):"
docker compose exec frontend ls -lh /usr/share/nginx/html/assets/ | tail -5 || echo "Keine Assets gefunden"

echo ""
echo "✅ Alle Container wurden neu gebaut und gestartet!"
echo ""
echo "🧪 WICHTIG: Browser-Cache leeren!"
echo "   - Chrome/Edge: Cmd+Shift+R (Mac) oder Ctrl+Shift+R (Windows)"
echo "   - Firefox: Cmd+Shift+R (Mac) oder Ctrl+Shift+R (Windows)"
echo "   - Safari: Cmd+Option+R"
echo "   - Oder: Inkognito-Modus verwenden"
echo ""
echo "🌐 Teste: https://chatbotcarsten.live"
echo ""
ENDSSH

echo ""
echo "✅ Prüfung und Cache-Leerung abgeschlossen!"
echo ""

