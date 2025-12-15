#!/bin/bash

# Script zum Beheben des CORS-Problems

cd /opt/medical-chatbot/Desktop/Arzt\ Chatbot/medical-chatbot

echo "🔧 Aktualisiere CORS-Origins..."

# Aktualisiere CORS-Origins (mit chatbotcarsten.live)
sed -i "s|CORS_ORIGINS:.*|CORS_ORIGINS: http://localhost:3000,https://cosmic-jalebi-b78f17.netlify.app,https://chatbotcarsten.live|g" docker-compose.yml

echo "✅ CORS-Origins aktualisiert:"
grep CORS_ORIGINS docker-compose.yml

echo ""
echo "🔄 Starte Backend neu..."
docker compose restart backend

echo ""
echo "⏳ Warte 5 Sekunden..."
sleep 5

echo ""
echo "🧪 Teste CORS..."
curl -X OPTIONS https://chatbotcarsten.live/api/chat/session \
  -H "Origin: https://cosmic-jalebi-b78f17.netlify.app" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type, X-API-Key" \
  -i 2>&1 | grep -E "(HTTP|access-control-allow-origin|Disallowed)" | head -5

echo ""
echo "✅ Fertig! Teste jetzt das Widget im Browser."

