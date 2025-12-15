#!/bin/bash

# Script zum Fixen der iframe-Einbindung

echo "📤 Kopiere geänderte Dateien auf den Server..."

SERVER="root@37.27.12.97"
SERVER_PATH="/opt/medical-chatbot/Desktop/Arzt Chatbot/medical-chatbot"

# Kopiere Dateien
scp backend/main.py $SERVER:$SERVER_PATH/backend/
scp frontend/nginx.conf $SERVER:$SERVER_PATH/frontend/

echo "✅ Dateien kopiert!"
echo ""
echo "🔨 Baue Backend und Frontend neu..."

# Baue auf dem Server neu
ssh $SERVER "cd $SERVER_PATH && \
  docker compose build backend frontend && \
  docker compose restart backend frontend"

echo ""
echo "✅ Fertig! Teste jetzt das iframe auf deiner Website."

