#!/bin/bash

# Script zum Testen von CORS

echo "🧪 Teste CORS Preflight (OPTIONS)..."
echo ""

# Teste OPTIONS-Request
curl -X OPTIONS https://chatbotcarsten.live/api/chat/session \
  -H "Origin: https://cosmic-jalebi-b78f17.netlify.app" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type, X-API-Key" \
  -v 2>&1 | grep -E "(< HTTP|< Access-Control|OPTIONS)"

echo ""
echo "🧪 Teste POST-Request..."
curl -X POST https://chatbotcarsten.live/api/chat/session \
  -H "Origin: https://cosmic-jalebi-b78f17.netlify.app" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: 12345" \
  -v 2>&1 | head -20

