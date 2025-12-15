#!/bin/bash

# Script zum Prüfen und Beheben des Backend-Problems

echo "🔍 Prüfe Backend-Status..."
echo ""

# Prüfe Docker-Container
echo "📦 Docker-Container:"
docker compose ps

echo ""
echo "🌐 Teste Backend direkt (Port 8000):"
echo "Health:"
curl -s http://localhost:8000/health || echo "❌ /health nicht erreichbar"
echo ""
echo "API Health:"
curl -s http://localhost:8000/api/health || echo "❌ /api/health nicht erreichbar"
echo ""
echo "Chat Session (sollte 401 geben wegen fehlendem API-Key):"
curl -s -X POST http://localhost:8000/api/chat/session -H "Content-Type: application/json" || echo "❌ /api/chat/session nicht erreichbar"

echo ""
echo "📋 Nginx-Status:"
systemctl status nginx --no-pager -l | head -5

echo ""
echo "📋 Nginx-Konfiguration prüfen:"
nginx -t

echo ""
echo "📋 Aktuelle Nginx-Konfiguration für /api:"
grep -A 10 "location /api" /etc/nginx/sites-available/medical-chatbot || echo "❌ Keine /api location gefunden"

