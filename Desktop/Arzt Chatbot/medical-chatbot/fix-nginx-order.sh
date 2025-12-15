#!/bin/bash

# Script zum Beheben der Location-Block-Reihenfolge

cat > /etc/nginx/sites-available/medical-chatbot << 'EOF'
server {
    listen 80;
    server_name chatbotcarsten.live;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name chatbotcarsten.live;

    ssl_certificate /etc/letsencrypt/live/chatbotcarsten.live/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/chatbotcarsten.live/privkey.pem;
    
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Backend API - MUSS VOR / stehen!
    location /api {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # WebSocket Support
    location /ws {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Frontend - MUSS NACH /api stehen!
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF

# Teste Konfiguration
nginx -t

# Starte Nginx neu
systemctl restart nginx

echo "✅ Nginx-Konfiguration aktualisiert!"
echo "🧪 Teste jetzt: curl -I https://chatbotcarsten.live/api/health"

