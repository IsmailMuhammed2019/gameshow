#!/bin/bash

# ==========================================
# Millionaire Game Show - Deployment Validator
# ==========================================
# This script validates that the deployment is working correctly

set -e

echo "🔍 Millionaire Game Show - Deployment Validation"
echo "================================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Counters
PASSED=0
FAILED=0

# Function to print colored output
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
    PASSED=$((PASSED + 1))
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
    FAILED=$((FAILED + 1))
}

print_info() {
    echo -e "ℹ $1"
}

# Load environment variables if .env exists
if [ -f .env ]; then
    set -a
    source .env
    set +a
fi

BACKEND_PORT=${BACKEND_PORT:-3001}
FRONTEND_PORT=${FRONTEND_PORT:-3000}

echo "Testing on localhost (ports: Backend=$BACKEND_PORT, Frontend=$FRONTEND_PORT)"
echo ""

# Test 1: Check if Docker containers are running
print_info "Test 1: Checking Docker containers..."
if docker-compose ps | grep -q "Up"; then
    print_success "Docker containers are running"
else
    print_error "Docker containers are not running"
    echo "   Run: docker-compose up -d"
fi
echo ""

# Test 2: Backend health check
print_info "Test 2: Checking backend health..."
if curl -s -f "http://localhost:$BACKEND_PORT/health" > /dev/null 2>&1; then
    HEALTH=$(curl -s "http://localhost:$BACKEND_PORT/health")
    print_success "Backend is healthy"
    echo "   $HEALTH"
else
    print_error "Backend health check failed"
    echo "   Check logs: docker-compose logs backend"
fi
echo ""

# Test 3: Backend readiness
print_info "Test 3: Checking backend readiness..."
if curl -s -f "http://localhost:$BACKEND_PORT/health/ready" > /dev/null 2>&1; then
    print_success "Backend is ready"
else
    print_error "Backend readiness check failed"
fi
echo ""

# Test 4: Backend liveness
print_info "Test 4: Checking backend liveness..."
if curl -s -f "http://localhost:$BACKEND_PORT/health/live" > /dev/null 2>&1; then
    print_success "Backend is alive"
else
    print_error "Backend liveness check failed"
fi
echo ""

# Test 5: Frontend accessibility
print_info "Test 5: Checking frontend accessibility..."
if curl -s -f "http://localhost:$FRONTEND_PORT" > /dev/null 2>&1; then
    print_success "Frontend is accessible"
else
    print_error "Frontend is not accessible"
    echo "   Check logs: docker-compose logs frontend"
fi
echo ""

# Test 6: Database connectivity
print_info "Test 6: Checking database..."
if docker-compose exec -T postgres pg_isready -U postgres > /dev/null 2>&1; then
    print_success "Database is running"
else
    print_error "Database is not accessible"
    echo "   Check logs: docker-compose logs postgres"
fi
echo ""

# Test 7: Database has data
print_info "Test 7: Checking database data..."
USER_COUNT=$(docker-compose exec -T postgres psql -U postgres -d ${POSTGRES_DB:-millionaire_game} -t -c "SELECT COUNT(*) FROM users;" 2>/dev/null | xargs || echo "0")
if [ "$USER_COUNT" -gt 0 ]; then
    print_success "Database has $USER_COUNT users"
else
    print_error "Database appears to be empty"
    echo "   Run: docker-compose exec backend npx prisma db seed"
fi
echo ""

# Test 8: Episode data
print_info "Test 8: Checking episodes..."
EPISODE_COUNT=$(docker-compose exec -T postgres psql -U postgres -d ${POSTGRES_DB:-millionaire_game} -t -c "SELECT COUNT(*) FROM episodes;" 2>/dev/null | xargs || echo "0")
if [ "$EPISODE_COUNT" -gt 0 ]; then
    print_success "Database has $EPISODE_COUNT episodes"
else
    print_error "Database has no episodes"
    echo "   Episodes should be created automatically during seed"
fi
echo ""

# Test 9: Check CORS configuration
print_info "Test 9: Checking CORS configuration..."
if [ -n "$ALLOWED_ORIGINS" ]; then
    print_success "CORS origins configured: $ALLOWED_ORIGINS"
else
    print_error "ALLOWED_ORIGINS not set in environment"
    echo "   Add ALLOWED_ORIGINS to your .env file"
fi
echo ""

# Test 10: Check environment variables
print_info "Test 10: Checking environment variables..."
MISSING_VARS=()

if [ -z "$NEXT_PUBLIC_API_URL" ]; then
    MISSING_VARS+=("NEXT_PUBLIC_API_URL")
fi

if [ -z "$JWT_SECRET" ] || [ "$JWT_SECRET" = "your-super-secret-jwt-key-change-this-in-production" ]; then
    MISSING_VARS+=("JWT_SECRET (or using default - CHANGE THIS!)")
fi

if [ ${#MISSING_VARS[@]} -eq 0 ]; then
    print_success "All required environment variables are set"
else
    print_error "Missing or default environment variables:"
    for var in "${MISSING_VARS[@]}"; do
        echo "   - $var"
    done
fi
echo ""

# Summary
echo "======================================"
echo "Validation Summary"
echo "======================================"
echo -e "${GREEN}Passed: $PASSED${NC}"
echo -e "${RED}Failed: $FAILED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}🎉 All tests passed! Your deployment is working correctly.${NC}"
    echo ""
    echo "Next steps:"
    echo "1. Access the frontend at: http://localhost:$FRONTEND_PORT"
    echo "2. Login with: admin / admin123 (Game Master)"
    echo "3. Or: general_admin / admin456 (General Admin)"
    exit 0
else
    echo -e "${RED}⚠️  Some tests failed. Please fix the issues above.${NC}"
    echo ""
    echo "Common fixes:"
    echo "- Wait a bit longer for containers to start"
    echo "- Check logs: docker-compose logs -f"
    echo "- Restart: docker-compose restart"
    exit 1
fi

