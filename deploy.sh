#!/bin/bash

# ==========================================
# Millionaire Game Show - Deployment Script
# ==========================================
# This script helps deploy the application on any system

set -e  # Exit on error

echo "🎮 Millionaire Game Show - Deployment Script"
echo "=============================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_info() {
    echo -e "ℹ $1"
}

# Check if .env file exists
if [ ! -f .env ]; then
    print_warning ".env file not found!"
    echo ""
    print_info "Creating .env file from env.template..."
    
    if [ -f env.template ]; then
        cp env.template .env
        print_success ".env file created"
        echo ""
        print_warning "⚠️  IMPORTANT: Please edit .env file with your actual configuration!"
        echo ""
        echo "You need to set:"
        echo "  - SERVER_HOST (your IP or domain)"
        echo "  - NEXT_PUBLIC_API_URL"
        echo "  - NEXT_PUBLIC_WS_URL"
        echo "  - ALLOWED_ORIGINS"
        echo "  - JWT_SECRET (generate a secure one!)"
        echo ""
        read -p "Press Enter after you've updated the .env file..."
    else
        print_error "env.template not found! Please create .env manually."
        exit 1
    fi
fi

# Load environment variables
set -a
source .env
set +a

print_success "Environment variables loaded"
echo ""

# Detect server IP if not set
if [ -z "$SERVER_HOST" ] || [ "$SERVER_HOST" = "localhost" ]; then
    print_warning "SERVER_HOST not configured or set to localhost"
    print_info "Detecting server IP address..."
    
    # Try to detect public IP
    SERVER_IP=$(hostname -I | awk '{print $1}')
    
    if [ -n "$SERVER_IP" ]; then
        print_info "Detected IP: $SERVER_IP"
        echo ""
        read -p "Use this IP for deployment? (y/n): " use_ip
        
        if [ "$use_ip" = "y" ] || [ "$use_ip" = "Y" ]; then
            export SERVER_HOST=$SERVER_IP
            export NEXT_PUBLIC_API_URL="http://$SERVER_IP:${BACKEND_PORT:-3001}"
            export NEXT_PUBLIC_WS_URL="http://$SERVER_IP:${BACKEND_PORT:-3001}"
            export ALLOWED_ORIGINS="http://$SERVER_IP:${FRONTEND_PORT:-3000},http://$SERVER_IP:${BACKEND_PORT:-3001}"
            export FRONTEND_URL="http://$SERVER_IP:${FRONTEND_PORT:-3000}"
            
            print_success "Configuration updated for IP: $SERVER_IP"
        fi
    fi
    echo ""
fi

# Display configuration
echo "📋 Deployment Configuration:"
echo "----------------------------"
echo "Server Host:    $SERVER_HOST"
echo "Frontend URL:   $NEXT_PUBLIC_API_URL"
echo "Backend URL:    $NEXT_PUBLIC_API_URL"
echo "WebSocket URL:  $NEXT_PUBLIC_WS_URL"
echo "Environment:    ${NODE_ENV:-production}"
echo ""

# Check Docker
print_info "Checking Docker installation..."
if ! command -v docker &> /dev/null; then
    print_error "Docker is not installed!"
    echo "Please install Docker first: https://docs.docker.com/get-docker/"
    exit 1
fi
print_success "Docker is installed"

print_info "Checking Docker Compose..."
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    print_error "Docker Compose is not installed!"
    echo "Please install Docker Compose first: https://docs.docker.com/compose/install/"
    exit 1
fi
print_success "Docker Compose is installed"
echo ""

# Stop existing containers
print_info "Stopping existing containers..."
docker-compose down 2>/dev/null || true
print_success "Containers stopped"
echo ""

# Build and start containers
print_info "Building and starting containers..."
echo ""

docker-compose up -d --build

echo ""
print_success "Containers are starting..."
echo ""

# Wait for backend to be ready
print_info "Waiting for backend to be ready..."
max_attempts=60
attempt=0

while [ $attempt -lt $max_attempts ]; do
    if curl -s "http://localhost:${BACKEND_PORT:-3001}/health" > /dev/null 2>&1; then
        print_success "Backend is ready!"
        break
    fi
    
    attempt=$((attempt + 1))
    if [ $attempt -eq $max_attempts ]; then
        print_error "Backend failed to start within 60 seconds"
        echo ""
        echo "Check logs with: docker-compose logs backend"
        exit 1
    fi
    
    echo -n "."
    sleep 1
done

echo ""
echo ""

# Display access information
echo "🎉 Deployment Complete!"
echo "======================"
echo ""
echo "🌐 Access URLs:"
echo "   Frontend:  http://$SERVER_HOST:${FRONTEND_PORT:-3000}"
echo "   Backend:   http://$SERVER_HOST:${BACKEND_PORT:-3001}"
echo "   Health:    http://$SERVER_HOST:${BACKEND_PORT:-3001}/health"
echo ""
echo "🔑 Default Admin Credentials:"
echo "   Game Master:    admin / admin123"
echo "   General Admin:  general_admin / admin456"
echo ""
echo "📊 Useful Commands:"
echo "   View logs:      docker-compose logs -f"
echo "   Stop app:       docker-compose down"
echo "   Restart app:    docker-compose restart"
echo "   View status:    docker-compose ps"
echo ""
echo "📱 Mobile Access:"
echo "   On your mobile device, access: http://$SERVER_HOST:${FRONTEND_PORT:-3000}"
echo ""
print_warning "⚠️  Remember: Keep your .env file secure and don't commit it to git!"
echo ""
