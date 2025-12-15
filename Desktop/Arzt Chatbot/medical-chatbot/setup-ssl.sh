#!/bin/bash

# Script zum Einrichten von SSL/HTTPS auf dem Server
# Benötigt eine Domain, die auf die Server-IP zeigt

set -e

echo "🔒 SSL/HTTPS Setup für Medical Chatbot"
echo ""

# Prüfe ob als root ausgeführt
if [ "$EUID" -ne 0 ]; then 
    echo "❌ Bitte als root ausführen: sudo $0"
    exit 1
fi

# Prüfe ob certbot installiert ist
if ! command -v certbot &> /dev/null; then
    echo "📦 Installiere Certbot..."
    apt update
    apt install -y certbot python3-certbot-nginx
fi

echo ""
echo "📋 Bitte gib deine Domain ein (z.B. chatbot.deine-domain.de):"
read -r DOMAIN

if [ -z "$DOMAIN" ]; then
    echo "❌ Domain darf nicht leer sein"
    exit 1
fi

echo ""
echo "🔧 Konfiguriere Nginx für SSL..."

# Erstelle Nginx-Konfiguration für SSL
cat > /etc/nginx/sites-available/medical-chatbot-ssl << EOF
server {
    listen 80;
    server_name $DOMAIN;
    
    # Redirect HTTP to HTTPS
    return 301 https://\$server_name\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name $DOMAIN;

    ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;
    
    # SSL Configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Frontend
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }

    # WebSocket Support
    location /ws {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF

# Aktiviere die Konfiguration
ln -sf /etc/nginx/sites-available/medical-chatbot-ssl /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Teste Nginx-Konfiguration
nginx -t

echo ""
echo "🔒 Erstelle SSL-Zertifikat mit Let's Encrypt..."
echo "⚠️  Stelle sicher, dass die Domain $DOMAIN auf die Server-IP zeigt!"
echo ""

certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos --email admin@$DOMAIN --redirect

echo ""
echo "✅ SSL erfolgreich eingerichtet!"
echo ""
echo "🌐 Deine URLs:"
echo "   Widget: https://$DOMAIN/widget.js"
echo "   Backend: https://$DOMAIN/api"
echo ""
echo "📝 Aktualisiere deine Website mit:"
echo "   <script src=\"https://$DOMAIN/widget.js\"></script>"
echo ""

