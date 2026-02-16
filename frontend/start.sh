# Generate self-signed certificate if missing to prevent Nginx crash
# Note: /etc/nginx/ssl is now a mounted directory. 
# If it's read-only, we can't write to it.
# But we can write to a different location and symlink or just use that location in nginx.conf if we updated it.
# However, for now, let's assume valid certs are provided by host (deploy.sh handles it).
# This script just warns if they are missing.

if [ ! -f /etc/nginx/ssl/fullchain.pem ] || [ ! -f /etc/nginx/ssl/privkey.pem ]; then
    echo "⚠️  SSL certificates not found in /etc/nginx/ssl!"
    echo "    Nginx might fail to start on port 443."
    echo "    Attempting to generate fallback self-signed certs in /etc/nginx/fallback_ssl..."
    
    mkdir -p /etc/nginx/fallback_ssl
    if command -v openssl >/dev/null 2>&1; then
        openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
            -keyout /etc/nginx/fallback_ssl/privkey.pem \
            -out /etc/nginx/fallback_ssl/fullchain.pem \
            -subj "/C=US/ST=Fallback/L=Local/O=Tg2Mail/CN=localhost"
            
        echo "✅ Fallback certificates generated."
        
        # Update Nginx config to use fallback paths
        echo "⚠️ Updating Nginx config to use fallback certificates..."
        sed -i 's|/etc/nginx/ssl/fullchain.pem|/etc/nginx/fallback_ssl/fullchain.pem|g' /etc/nginx/conf.d/default.conf
        sed -i 's|/etc/nginx/ssl/privkey.pem|/etc/nginx/fallback_ssl/privkey.pem|g' /etc/nginx/conf.d/default.conf
        
    else
        echo "❌ OpenSSL not found."
    fi
fi

# Start Nginx
echo "🚀 Starting Nginx..."
nginx -g "daemon off;"
