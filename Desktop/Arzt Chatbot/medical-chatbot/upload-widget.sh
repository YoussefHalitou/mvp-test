#!/bin/bash

# Script zum Hochladen des Widget-Scripts auf den Server

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
WIDGET_FILE="$SCRIPT_DIR/widget-embed.js"
SERVER_HOST="${1:-root@37.27.12.97}"

if [ ! -f "$WIDGET_FILE" ]; then
    echo "❌ Widget-Datei nicht gefunden: $WIDGET_FILE"
    exit 1
fi

echo "📤 Lade Widget-Script auf Server hoch..."
echo ""

# Kopiere Widget-Script auf Server
scp "$WIDGET_FILE" "$SERVER_HOST:/tmp/widget.js"

echo ""
echo "📋 Führe auf dem Server aus:"
echo ""
echo "   docker compose cp /tmp/widget.js frontend:/usr/share/nginx/html/widget.js"
echo ""
echo "   Oder:"
echo "   docker compose exec frontend sh -c 'cat > /usr/share/nginx/html/widget.js' < /tmp/widget.js"
echo ""

