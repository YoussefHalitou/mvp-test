#!/bin/bash

# Script zum Prüfen der CORS-Konfiguration

echo "🔍 Prüfe CORS-Konfiguration..."
echo ""

echo "📋 docker-compose.yml CORS_ORIGINS:"
grep CORS_ORIGINS docker-compose.yml

echo ""
echo "📋 Backend Environment (im Container):"
docker compose exec backend env | grep CORS_ORIGINS

echo ""
echo "🧪 Teste mit verschiedenen Origins:"
echo ""

echo "1. Teste mit Netlify-Origin:"
curl -X OPTIONS https://chatbotcarsten.live/api/chat/session \
  -H "Origin: https://cosmic-jalebi-b78f17.netlify.app" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type, X-API-Key" \
  -i 2>&1 | grep -E "(HTTP|access-control-allow-origin|Disallowed)"

echo ""
echo "2. Teste mit chatbotcarsten.live:"
curl -X OPTIONS https://chatbotcarsten.live/api/chat/session \
  -H "Origin: https://chatbotcarsten.live" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type, X-API-Key" \
  -i 2>&1 | grep -E "(HTTP|access-control-allow-origin|Disallowed)"

