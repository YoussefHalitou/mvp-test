#!/bin/bash

# Script zum Debuggen des CORS-Problems

cd /opt/medical-chatbot/Desktop/Arzt\ Chatbot/medical-chatbot

echo "🔍 Debug: CORS_ORIGINS Problem"
echo ""

echo "1️⃣ Prüfe docker-compose.yml:"
grep -A 2 "CORS_ORIGINS" docker-compose.yml

echo ""
echo "2️⃣ Prüfe .env Datei:"
cat .env

echo ""
echo "3️⃣ Prüfe Backend Environment (im Container):"
docker compose exec backend env | grep CORS_ORIGINS

echo ""
echo "4️⃣ Prüfe Backend Settings (geladene Werte):"
docker compose exec backend python3 -c "
import sys
sys.path.insert(0, '/app')
from backend.settings import get_settings
settings = get_settings()
print('CORS Origins:', settings.cors_origins)
"

echo ""
echo "5️⃣ Stoppe Backend komplett und starte neu:"
docker compose stop backend
docker compose up -d backend

echo ""
echo "⏳ Warte 5 Sekunden..."
sleep 5

echo ""
echo "6️⃣ Prüfe Backend Environment erneut:"
docker compose exec backend env | grep CORS_ORIGINS

echo ""
echo "7️⃣ Teste CORS:"
curl -X OPTIONS https://chatbotcarsten.live/api/chat/session \
  -H "Origin: https://cosmic-jalebi-b78f17.netlify.app" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type, X-API-Key" \
  -i 2>&1 | grep -E "(HTTP|access-control-allow-origin|Disallowed)" | head -3

