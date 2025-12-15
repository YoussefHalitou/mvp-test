#!/bin/bash

# Script zum Aktualisieren der CORS-Origins für Netlify

set -e

NETLIFY_URL="${1:-https://cosmic-jalebi-b78f17.netlify.app}"

echo "🔧 Aktualisiere CORS-Origins für Netlify..."
echo "   Netlify URL: $NETLIFY_URL"
echo ""

cd /opt/medical-chatbot/Desktop/Arzt\ Chatbot/medical-chatbot

# Backup erstellen
cp docker-compose.yml docker-compose.yml.bak-$(date +%Y%m%d-%H%M%S)

# CORS_ORIGINS aktualisieren
if grep -q "CORS_ORIGINS:" docker-compose.yml; then
    # Ersetze die bestehende CORS_ORIGINS Zeile
    sed -i "s|CORS_ORIGINS:.*|CORS_ORIGINS: http://localhost:3000,$NETLIFY_URL|g" docker-compose.yml
else
    # Füge CORS_ORIGINS hinzu falls nicht vorhanden
    sed -i "/ENFORCE_HTTPS:/a\      CORS_ORIGINS: http://localhost:3000,$NETLIFY_URL" docker-compose.yml
fi

echo "✅ CORS-Origins aktualisiert"
echo ""
echo "🔄 Starte Backend neu..."

docker compose restart backend

echo ""
echo "✅ Fertig!"
echo ""
echo "⚠️  WICHTIG: Das Mixed-Content-Problem bleibt bestehen!"
echo "   HTTPS-Websites können keine HTTP-Anfragen stellen."
echo ""
echo "📋 Lösungen:"
echo "   1. SSL auf Server einrichten (siehe setup-ssl.sh)"
echo "   2. Oder Backend-URL in Widget auf HTTPS ändern (wenn SSL eingerichtet)"
echo ""

