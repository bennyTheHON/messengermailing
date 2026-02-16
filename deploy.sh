#!/bin/bash

# Stop on error
set -e

echo "========================================"
echo " Telegram Auto-Forwarder - Setup Wizard"
echo "========================================"
echo ""

# Check if docker is installed
if ! command -v docker &> /dev/null
then
    echo "Docker could not be found. Please install Docker and Docker Compose first."
    exit 1
fi

# Create directories
mkdir -p monitor_session
mkdir -p ssl

# Function to generate SSL with Let's Encrypt
generate_ssl() {
    echo ""
    echo "--- Let's Encrypt SSL Setup ---"
    read -p "Enter your domain name (e.g., example.com): " DOMAIN
    read -p "Enter your email address (for expiration alerts): " EMAIL
    
    echo ""
    echo "Choose validation method:"
    echo "1) HTTP Challenge (Webroot) - Requires port 80 open & mapped to domain"
    echo "2) DNS Challenge (Manual) - Requires adding TXT record to DNS"
    read -p "Select method (1/2): " SSL_METHOD
    
    if [ "$SSL_METHOD" == "2" ]; then
        echo ""
        echo "Running Certbot in Manual DNS mode..."
        echo "NOTE: You will be asked to add a TXT record to your DNS settings."
        echo "Press Enter when you are ready..."
        read
        
        docker run -it --rm --name certbot \
            -v "$(pwd)/letsencrypt:/etc/letsencrypt" \
            certbot/certbot certonly \
            --manual \
            --preferred-challenges dns \
            -d "$DOMAIN" \
            --email "$EMAIL" \
            --agree-tos
            
    else
        echo ""
        echo "Starting Nginx for ACME challenge..."
        # Create webroot directory first
        mkdir -p letsencrypt/www
        chmod 777 letsencrypt/www
        
        # Ensure containers are up so Nginx can serve the challenge
        # Force recreate to pick up new volume mounts/config
        docker-compose up -d --force-recreate frontend
    
        echo "Running Certbot..."
        # Use docker certbot to generate certs in ./letsencrypt directory
        docker run -it --rm --name certbot \
            --network container:teleg_frontend \
            -v "$(pwd)/letsencrypt:/etc/letsencrypt" \
            -v "$(pwd)/letsencrypt/www:/var/www/certbot" \
            certbot/certbot certonly \
            --webroot \
            --webroot-path=/var/www/certbot \
            -d "$DOMAIN" \
            --email "$EMAIL" \
            --agree-tos \
            --non-interactive
    fi
        
    if [ -f "./letsencrypt/live/$DOMAIN/fullchain.pem" ]; then
        echo "✓ Certificate generated successfully!"
        
        # Copy certs to ssl folder (dereference symlinks)
        cp -L "./letsencrypt/live/$DOMAIN/fullchain.pem" ./ssl/fullchain.pem
        cp -L "./letsencrypt/live/$DOMAIN/privkey.pem" ./ssl/privkey.pem
        
        # Save domain to .env for future reference
        if grep -q "SSL_DOMAIN=" .env; then
            sed -i "s/SSL_DOMAIN=.*/SSL_DOMAIN=$DOMAIN/" .env
        else
            echo "SSL_DOMAIN=$DOMAIN" >> .env
        fi
        
        return 0
    else
        echo "❌ Certificate generation failed."
        return 1
    fi
}

# Check for .env file
if [ ! -f .env ]; then
    echo "No configuration found. Starting interactive setup..."
    echo ""
    
    # Get Web Panel Configuration
    echo "Step 1/3: Web Panel Configuration"
    read -p "Web Panel Port (default: 80): " WEB_PORT
    WEB_PORT=${WEB_PORT:-80}
    read -p "SSL Port (default: 443): " SSL_PORT
    SSL_PORT=${SSL_PORT:-443}
    echo ""
    
    # Create Initial Admin Account
    echo "Step 4/5: Initial Admin Account"
    echo "This account will be created on first run."
    read -p "Admin Username (default: admin): " ADMIN_USER
    ADMIN_USER=${ADMIN_USER:-admin}
    
    while true; do
        read -sp "Admin Password: " ADMIN_PASS
        echo ""
        read -sp "Confirm Admin Password: " ADMIN_PASS_CONFIRM
        echo ""
        if [ "$ADMIN_PASS" == "$ADMIN_PASS_CONFIRM" ]; then
            break
        else
            echo "Passwords do not match. Please try again."
        fi
    done
    
    # Write to .env
cat <<EOF > .env
WEB_PORT=$WEB_PORT
SSL_PORT=${SSL_PORT:-443}
ADMIN_USERNAME=${ADMIN_USER:-admin}
ADMIN_PASSWORD=${ADMIN_PASS:-admin}
EOF
    
    # Restrict permissions for security
    chmod 600 .env
    
    echo "✓ Configuration saved to .env"
    echo ""
fi

# Load environment variables
export $(cat .env | xargs)

# SSL Setup Step
if [ ! -f ./ssl/fullchain.pem ] && [ -z "$HOST_SSL_CERT_PATH" ]; then
    echo "Step 5/5: SSL Configuration"
    echo "No SSL certificate found."
    echo "1) Generate a free SSL cert with Let's Encrypt"
    echo "2) Use existing SSL certificates from your host (external paths)"
    echo "3) Skip (Use self-signed for now)"
    read -p "Select option (1/2/3): " WANT_SSL
    
    if [ "$WANT_SSL" == "1" ]; then
        generate_ssl
    elif [ "$WANT_SSL" == "2" ]; then
        echo ""
        read -p "Enter full path to fullchain.pem: " HOST_CERT
        read -p "Enter full path to privkey.pem: " HOST_KEY
        
        if [ -f "$HOST_CERT" ] && [ -f "$HOST_KEY" ]; then
            # Copy to local ssl directory to avoid symlink/mount issues
            echo "Copying certificates to local ./ssl directory..."
            cp -L "$HOST_CERT" ./ssl/fullchain.pem
            cp -L "$HOST_KEY" ./ssl/privkey.pem
            
            # Clear HOST_SSL_PATH so docker-compose uses ./ssl
            if grep -q "HOST_SSL_PATH=" .env; then
                sed -i "s|HOST_SSL_PATH=.*|HOST_SSL_PATH=./ssl|" .env
            else
                echo "HOST_SSL_PATH=./ssl" >> .env
            fi
            
            echo "✓ Certificates copied successfully."
        else
            echo "⚠️ Warning: One or both files not found at provided paths. Skipping external mapping."
        fi
    else
        echo "Skipping Let's Encrypt setup."
        # Generate dummy certs if they don't exist to prevent Docker from making a directory
        if [ ! -f ./ssl/fullchain.pem ]; then
            echo "Generating self-signed placeholder certificates..."
            if command -v openssl >/dev/null 2>&1; then
                openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
                    -keyout ./ssl/privkey.pem \
                    -out ./ssl/fullchain.pem \
                    -subj "/C=US/ST=Setup/L=Local/O=Auto/CN=localhost"
                
                # Check if generated successfully
                if [ -f ./ssl/fullchain.pem ]; then
                    echo "✓ Self-signed certificates generated."
                else
                    echo "⚠️ Failed to generate certificates. Docker might create a directory."
                fi
            else
                echo "⚠️ OpenSSL not found. Cannot generate placeholder certificates."
            fi
        fi
    fi
else
    echo "Existing SSL configuration detected. Skipping setup wizard."
fi

# Update docker-compose with custom port
if [ ! -z "$WEB_PORT" ]; then
    sed -i "s/- \"[0-9]*:80\"/- \"$WEB_PORT:80\"/g" docker-compose.yml
fi
if [ ! -z "$SSL_PORT" ]; then
    sed -i "s/- \"[0-9]*:443\"/- \"$SSL_PORT:443\"/g" docker-compose.yml
fi

# Build and Run
echo "Building and starting containers..."
docker-compose up -d --build

echo ""
echo "========================================"
echo "✓ Deployment successful!"
echo "========================================"
if [ -f ./ssl/fullchain.pem ]; then
    echo "App is running at: https://${SSL_DOMAIN:-your-server-ip}:${SSL_PORT:-443}"
else
    echo "App is running at: http://${SSL_DOMAIN:-your-server-ip}:${WEB_PORT:-80}"
fi
echo "Admin Login: $ADMIN_USERNAME / (hidden)"
echo ""
