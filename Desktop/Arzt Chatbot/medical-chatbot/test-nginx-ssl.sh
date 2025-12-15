#!/bin/bash

# Script zum Testen von Nginx und SSL

echo "🔍 Prüfe Nginx-Status..."
systemctl status nginx --no-pager -l | head -10

echo ""
echo "🧪 Teste Nginx-Konfiguration:"
nginx -t

echo ""
echo "🌐 Teste HTTP (sollte zu HTTPS weiterleiten):"
curl -I http://chatbotcarsten.live 2>&1 | head -5

echo ""
echo "🌐 Teste HTTPS direkt:"
curl -I https://chatbotcarsten.live 2>&1 | head -5

echo ""
echo "🌐 Teste Backend über HTTPS:"
curl -I https://chatbotcarsten.live/api/health 2>&1 | head -5

echo ""
echo "🌐 Teste Backend mit POST:"
curl -X POST https://chatbotcarsten.live/api/chat/session \
  -H "Content-Type: application/json" \
  -H "X-API-Key: 12345" \
  2>&1 | head -10

echo ""
echo "📋 Nginx Error Log (letzte 10 Zeilen):"
tail -10 /var/log/nginx/error.log

echo ""
echo "📋 Nginx Access Log (letzte 5 Zeilen):"
tail -5 /var/log/nginx/access.log

