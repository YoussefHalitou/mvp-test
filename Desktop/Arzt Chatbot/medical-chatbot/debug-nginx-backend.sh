#!/bin/bash

# Debug-Script für Nginx-Backend-Problem

echo "🔍 Debug: Nginx-Backend-Verbindung"
echo ""

# Prüfe ob Backend direkt erreichbar ist
echo "1️⃣ Teste Backend direkt (Port 8000):"
curl -s http://localhost:8000/api/health
echo ""
echo ""

# Prüfe ob Nginx die Anfrage weiterleitet
echo "2️⃣ Teste über Nginx (localhost, HTTP):"
curl -s http://localhost/api/health || echo "❌ Nicht erreichbar"
echo ""
echo ""

# Prüfe Nginx Access Log
echo "3️⃣ Nginx Access Log (letzte 5 Zeilen):"
tail -5 /var/log/nginx/access.log
echo ""

# Prüfe Nginx Error Log
echo "4️⃣ Nginx Error Log (letzte 10 Zeilen):"
tail -10 /var/log/nginx/error.log
echo ""

# Prüfe Backend-Logs
echo "5️⃣ Backend-Logs (letzte 10 Zeilen):"
docker compose logs backend --tail 10
echo ""

# Teste mit verbose curl
echo "6️⃣ Teste HTTPS mit verbose curl:"
curl -v https://chatbotcarsten.live/api/health 2>&1 | grep -E "(< HTTP|> GET|Host:|X-Real-IP)"
echo ""

# Prüfe ob Nginx die richtige Konfiguration lädt
echo "7️⃣ Prüfe geladene Nginx-Konfiguration:"
nginx -T 2>/dev/null | grep -A 5 "location /api" | head -10

