#!/bin/bash

# ==========================================
# Quick Deploy Script - Millionaire Game Show
# ==========================================
# This script provides the fastest way to deploy on any system

set -e

clear

cat << "EOF"
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║     🎮  Millionaire Game Show - Quick Deploy  🎮          ║
║                                                           ║
║     Deploy on ANY system in minutes!                     ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
EOF

echo ""
echo "This script will help you deploy the game show on your system."
echo ""

# Detect IP
echo "🔍 Detecting your system configuration..."
echo ""

LOCAL_IP=$(hostname -I 2>/dev/null | awk '{print $1}' || echo "")

if [ -z "$LOCAL_IP" ]; then
    LOCAL_IP="localhost"
fi

echo "Detected IP address: $LOCAL_IP"
echo ""

# Ask user for deployment type
echo "Please select your deployment type:"
echo ""
echo "1) Local Machine Only (localhost)"
echo "2) Local Network (accessible from other devices: $LOCAL_IP)"
echo "3) Public Server (accessible from internet)"
echo "4) Custom Configuration"
echo ""
read -p "Enter your choice (1-4): " DEPLOY_TYPE

echo ""

# Set configuration based on choice
case $DEPLOY_TYPE in
    1)
        SERVER_HOST="localhost"
        API_URL="http://localhost:3001"
        WS_URL="http://localhost:3001"
        FRONTEND_URL="http://localhost:3000"
        ALLOWED_ORIGINS="http://localhost:3000,http://localhost:3001"
        NODE_ENV="development"
        echo "📍 Configuring for: Local Machine"
        ;;
    2)
        SERVER_HOST="$LOCAL_IP"
        API_URL="http://$LOCAL_IP:3001"
        WS_URL="http://$LOCAL_IP:3001"
        FRONTEND_URL="http://$LOCAL_IP:3000"
        ALLOWED_ORIGINS="http://$LOCAL_IP:3000,http://$LOCAL_IP:3001,http://localhost:3000"
        NODE_ENV="production"
        echo "📍 Configuring for: Local Network ($LOCAL_IP)"
        ;;
    3)
        echo ""
        read -p "Enter your public IP address or domain: " PUBLIC_HOST
        SERVER_HOST="$PUBLIC_HOST"
        API_URL="http://$PUBLIC_HOST:3001"
        WS_URL="http://$PUBLIC_HOST:3001"
        FRONTEND_URL="http://$PUBLIC_HOST:3000"
        ALLOWED_ORIGINS="http://$PUBLIC_HOST:3000,http://$PUBLIC_HOST:3001"
        NODE_ENV="production"
        echo "📍 Configuring for: Public Server ($PUBLIC_HOST)"
        ;;
    4)
        echo ""
        echo "Please edit the .env file manually after this script completes."
        echo "Then run: docker-compose up -d --build"
        exit 0
        ;;
    *)
        echo "Invalid choice. Exiting."
        exit 1
        ;;
esac

echo ""

# Generate JWT secret
JWT_SECRET=$(openssl rand -base64 32 2>/dev/null || echo "change-this-in-production-$(date +%s)")

# Create .env file
echo "📝 Creating configuration file..."

cat > .env << EOF
# Auto-generated configuration
# Generated on: $(date)
# Deployment type: $DEPLOY_TYPE

# Server Configuration
SERVER_HOST=$SERVER_HOST
BACKEND_PORT=3001
FRONTEND_PORT=3000
NODE_ENV=$NODE_ENV

# Security
JWT_SECRET=$JWT_SECRET

# URLs
NEXT_PUBLIC_API_URL=$API_URL
NEXT_PUBLIC_WS_URL=$WS_URL
FRONTEND_URL=$FRONTEND_URL
ALLOWED_ORIGINS=$ALLOWED_ORIGINS

# App Info
APP_NAME=Millionaire Game
APP_VERSION=1.0.0

# Database
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres123
POSTGRES_DB=millionaire_game
POSTGRES_PORT=5432
EOF

echo "✓ Configuration created"
echo ""

# Ensure persistent data directories exist
echo "📦 Ensuring persistent data directories exist..."
mkdir -p data/postgres backups
echo "   Data directory: $(readlink -f data/postgres 2>/dev/null || echo "$(pwd)/data/postgres")"
echo "   Backups directory: $(readlink -f backups 2>/dev/null || echo "$(pwd)/backups")"
echo ""

# Check Docker
echo "🐳 Checking Docker..."
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed!"
    echo ""
    echo "Please install Docker first:"
    echo "  Ubuntu/Debian: curl -fsSL https://get.docker.com | sh"
    echo "  Windows/Mac: https://www.docker.com/products/docker-desktop/"
    exit 1
fi
echo "✓ Docker found"

if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null 2>&1; then
    echo "❌ Docker Compose is not installed!"
    echo ""
    echo "Please install Docker Compose first:"
    echo "  https://docs.docker.com/compose/install/"
    exit 1
fi
echo "✓ Docker Compose found"
echo ""

# Deploy
echo "🚀 Starting deployment..."
echo ""
echo "This may take a few minutes on first run..."
echo ""

# Stop any existing containers
docker-compose down 2>/dev/null || true

# Start containers
docker-compose up -d --build

echo ""
echo "⏳ Waiting for services to be ready..."

# Wait for backend
max_wait=60
waited=0
while [ $waited -lt $max_wait ]; do
    if curl -s http://localhost:3001/health > /dev/null 2>&1; then
        break
    fi
    echo -n "."
    sleep 2
    waited=$((waited + 2))
done

echo ""
echo ""

if [ $waited -ge $max_wait ]; then
    echo "⚠️  Services are taking longer than expected to start."
    echo "   Check status with: docker-compose ps"
    echo "   Check logs with: docker-compose logs -f"
    echo ""
else
    echo "✅ Deployment complete!"
    echo ""
fi

# Display access information
cat << EOF
╔═══════════════════════════════════════════════════════════╗
║                    🎉 SUCCESS! 🎉                         ║
╚═══════════════════════════════════════════════════════════╝

📱 Access Your Game Show:

   Frontend:  $FRONTEND_URL
   Backend:   $API_URL
   Health:    $API_URL/health

🔑 Default Login Credentials:

   Game Master:
   - Username: admin
   - Password: admin123

   General Admin:
   - Username: general_admin
   - Password: admin456

📱 Mobile Access:
EOF

if [ "$DEPLOY_TYPE" = "2" ] || [ "$DEPLOY_TYPE" = "3" ]; then
    cat << EOF
   
   On your phone/tablet, open a browser and go to:
   $FRONTEND_URL
   
   Make sure your device is on the same network!
EOF
fi

cat << EOF

📊 Useful Commands:

   View logs:      docker-compose logs -f
   Stop app:       docker-compose down
   Restart:        docker-compose restart
   Status:         docker-compose ps
   Validate:       ./validate-deployment.sh

⚠️  Security Notes:

   - Change default passwords in production
   - Keep your .env file secure
   - Don't commit .env to version control

📖 Full documentation: See DEPLOYMENT.md

EOF

# Offer to run validation
echo ""
read -p "Would you like to run the validation script now? (y/n): " RUN_VALIDATION

if [ "$RUN_VALIDATION" = "y" ] || [ "$RUN_VALIDATION" = "Y" ]; then
    echo ""
    ./validate-deployment.sh
fi

echo ""
echo "🎮 Happy gaming!"
echo ""

