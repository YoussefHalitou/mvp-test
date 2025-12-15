#!/bin/bash

# Script zum Prüfen des Backends

echo "🔍 Prüfe Backend-Status..."
echo ""

# Prüfe Docker-Container
echo "📦 Docker-Container:"
docker compose ps

echo ""
echo "🌐 Teste Backend direkt (Port 8000):"
curl -s http://localhost:8000/api/health || echo "❌ Backend nicht erreichbar"

echo ""
echo "🌐 Teste über Nginx (Port 443):"
curl -s https://chatbotcarsten.live/api/health || echo "❌ Nginx nicht erreichbar"

echo ""
echo "📋 Nginx-Status:"
systemctl status nginx --no-pager -l | head -10

echo ""
echo "📋 Nginx-Konfiguration:"
nginx -t

