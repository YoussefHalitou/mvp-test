#!/bin/bash

# Script zum Beheben des 404-Problems

echo "🔍 Prüfe aktive Nginx-Konfiguration..."
echo ""

# Prüfe welche Sites aktiv sind
echo "📋 Aktive Nginx-Sites:"
ls -la /etc/nginx/sites-enabled/

echo ""
echo "📋 Vollständige Nginx-Konfiguration für chatbotcarsten.live:"
grep -A 50 "server_name chatbotcarsten.live" /etc/nginx/sites-available/medical-chatbot

echo ""
echo "🧪 Teste Backend direkt:"
curl -s http://localhost:8000/api/health

echo ""
echo "🧪 Teste Backend über Nginx (localhost):"
curl -s http://localhost/api/health || echo "❌ Nicht erreichbar"

echo ""
echo "📋 Prüfe ob Nginx die richtige Konfiguration lädt:"
nginx -T 2>/dev/null | grep -A 30 "server_name chatbotcarsten.live" | head -40

