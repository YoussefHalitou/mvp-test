#!/bin/bash

# Script zum Prüfen auf Reverse Proxy und Cache-Leerung

set -e

SERVER_USER="root"
SERVER_HOST="37.27.12.97"
PROJECT_DIR="/opt/medical-chatbot/Desktop/Arzt Chatbot/medical-chatbot"

echo "🔍 Prüfe auf Reverse Proxy und Cache..."
echo ""

ssh ${SERVER_USER}@${SERVER_HOST} << 'ENDSSH'
set -e

echo "📋 Prüfe ob Nginx auf dem Host läuft (Reverse Proxy):"
systemctl status nginx 2>/dev/null | head -5 || echo "Nginx läuft nicht auf dem Host"

echo ""
echo "📋 Prüfe ob andere Web-Server laufen:"
ps aux | grep -E "nginx|apache|httpd" | grep -v grep || echo "Keine anderen Web-Server gefunden"

echo ""
echo "📋 Prüfe Port 80 und 443:"
netstat -tlnp | grep -E ":80 |:443 " || ss -tlnp | grep -E ":80 |:443 " || echo "Keine Listeners auf 80/443 gefunden"

echo ""
echo "📋 Prüfe Frontend-Assets im Container:"
docker compose exec frontend ls -lh /usr/share/nginx/html/assets/ 2>/dev/null | tail -5 || echo "Container nicht erreichbar"

echo ""
echo "📋 Prüfe ob neue JavaScript-Datei den neuen Code enthält:"
docker compose exec frontend grep -l "Beschwerden einschätzen" /usr/share/nginx/html/assets/*.js 2>/dev/null | head -1 || echo "Datei nicht gefunden oder Container nicht erreichbar"

echo ""
echo "🧹 Leere alle möglichen Caches:"
echo "   - Docker Container Cache"
docker system prune -f 2>/dev/null || true

echo "   - Nginx Cache (falls vorhanden)"
docker compose exec frontend rm -rf /var/cache/nginx/* 2>/dev/null || true
docker compose exec frontend nginx -s reload 2>/dev/null || true

echo ""
echo "📊 Aktuelle Frontend-Asset-Namen:"
docker compose exec frontend ls -1 /usr/share/nginx/html/assets/*.js 2>/dev/null | xargs -n1 basename || echo "Keine Assets gefunden"

echo ""
echo "✅ Prüfung abgeschlossen!"
echo ""
ENDSSH

echo ""
echo "✅ Prüfung abgeschlossen!"
echo ""
echo "⚠️  WICHTIG: Browser-Cache leeren!"
echo "   - Öffne https://chatbotcarsten.live in einem Inkognito-Fenster"
echo "   - Oder: Hard Refresh (Cmd+Shift+R / Ctrl+Shift+R)"
echo "   - Oder: Browser-Cache komplett leeren"
echo ""

