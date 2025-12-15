#!/bin/bash

# Script zum Beheben des CORS-Problems

cd /opt/medical-chatbot/Desktop/Arzt\ Chatbot/medical-chatbot

echo "🔍 Prüfe .env Datei..."
if [ -f .env ]; then
    echo "📋 Aktuelle .env CORS_ORIGINS:"
    grep CORS_ORIGINS .env || echo "CORS_ORIGINS nicht in .env gefunden"
else
    echo "⚠️  .env Datei nicht gefunden"
fi

echo ""
echo "🔧 Aktualisiere docker-compose.yml..."
sed -i "s|CORS_ORIGINS:.*|CORS_ORIGINS: http://localhost:3000,https://cosmic-jalebi-b78f17.netlify.app,https://chatbotcarsten.live|g" docker-compose.yml

echo "✅ docker-compose.yml aktualisiert:"
grep CORS_ORIGINS docker-compose.yml

echo ""
echo "🔧 Aktualisiere .env (falls vorhanden)..."
if [ -f .env ]; then
    if grep -q "CORS_ORIGINS" .env; then
        sed -i "s|CORS_ORIGINS=.*|CORS_ORIGINS=http://localhost:3000,https://cosmic-jalebi-b78f17.netlify.app,https://chatbotcarsten.live|g" .env
    else
        echo "CORS_ORIGINS=http://localhost:3000,https://cosmic-jalebi-b78f17.netlify.app,https://chatbotcarsten.live" >> .env
    fi
    echo "✅ .env aktualisiert:"
    grep CORS_ORIGINS .env
else
    echo "📝 Erstelle .env Datei..."
    cat > .env << EOF
CORS_ORIGINS=http://localhost:3000,https://cosmic-jalebi-b78f17.netlify.app,https://chatbotcarsten.live
EOF
    echo "✅ .env erstellt"
fi

echo ""
echo "🔄 Starte Backend neu..."
docker compose restart backend

echo ""
echo "⏳ Warte 5 Sekunden..."
sleep 5

echo ""
echo "🧪 Prüfe Backend Environment..."
docker compose exec backend env | grep CORS_ORIGINS

echo ""
echo "🧪 Teste CORS..."
curl -X OPTIONS https://chatbotcarsten.live/api/chat/session \
  -H "Origin: https://cosmic-jalebi-b78f17.netlify.app" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type, X-API-Key" \
  -i 2>&1 | grep -E "(HTTP|access-control-allow-origin|Disallowed)" | head -3

echo ""
echo "✅ Fertig! Teste jetzt das Widget im Browser."

