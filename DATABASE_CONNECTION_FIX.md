# Database Connection Issues - Fix

## Problem
Database stops working and shows "Database not connected" error. Requires `docker-compose down` and `docker-compose up --build -d` to fix.

## Root Causes Identified

1. **No Connection Retry Logic**: Prisma doesn't automatically retry failed connections
2. **No Connection Pooling Configuration**: Default settings may cause connection exhaustion
3. **No Restart Policies**: Docker containers don't automatically restart on failure
4. **No Connection Health Monitoring**: System doesn't detect and recover from connection drops
5. **Database Connection Limits**: PostgreSQL default settings may be too restrictive

## Fixes Applied

### 1. ✅ Enhanced Prisma Service with Retry Logic

**File**: `backend/src/prisma/prisma.service.ts`

**Changes**:
- Added automatic reconnection with exponential backoff
- Added connection health monitoring
- Added error event handlers
- Added connection state tracking
- Maximum 10 reconnection attempts with increasing delays

**Features**:
- Automatically retries connection on failure
- Exponential backoff (5s → 7.5s → 11.25s → ... max 30s)
- Health check method to verify connection
- Proper error logging

### 2. ✅ Docker Restart Policies

**File**: `docker-compose.yml`

**Changes**:
- Added `restart: unless-stopped` to postgres service
- Added `restart: unless-stopped` to backend service
- Containers will automatically restart if they crash

### 3. ✅ Database Connection Pooling

**File**: `docker-compose.yml`

**Changes**:
- Added connection pool parameters to DATABASE_URL:
  - `connection_limit=10` - Limits concurrent connections
  - `pool_timeout=20` - Connection timeout in seconds
- Added PostgreSQL performance tuning:
  - `max_connections=200` - Increased from default 100
  - `shared_buffers=256MB` - Better memory management
  - `effective_cache_size=1GB` - Query optimization
  - Other performance optimizations

### 4. ✅ Improved Health Checks

**File**: `docker-compose.yml`

**Changes**:
- Enhanced postgres healthcheck with database name
- Added `start_period` to allow time for initialization
- Added backend healthcheck endpoint
- Better health check intervals and retries

### 5. ✅ Better Startup Sequence

**File**: `docker-compose.yml`

**Changes**:
- Added 5-second delay before running migrations
- Ensures database is fully ready before backend starts
- Better error handling in startup command

### 6. ✅ Improved Health Check Endpoint

**File**: `backend/src/app.controller.ts`

**Changes**:
- Uses PrismaService instead of creating new connections
- Automatically attempts reconnection if database is down
- Better error reporting

## Configuration Details

### Database URL with Pooling
```
postgresql://postgres:postgres123@postgres:5432/millionaire_game?schema=public&connection_limit=10&pool_timeout=20
```

### PostgreSQL Settings
- **max_connections**: 200 (increased from 100)
- **shared_buffers**: 256MB
- **effective_cache_size**: 1GB
- **work_mem**: 4MB
- **maintenance_work_mem**: 64MB

### Retry Logic
- **Max attempts**: 10
- **Initial delay**: 5 seconds
- **Max delay**: 30 seconds
- **Backoff**: Exponential (1.5x multiplier)

## How It Works Now

### Automatic Recovery:
1. **Connection Lost**: Prisma detects connection failure
2. **Auto Retry**: Automatically attempts reconnection
3. **Exponential Backoff**: Waits longer between each attempt
4. **Health Monitoring**: Continuously checks connection status
5. **Container Restart**: Docker automatically restarts containers if they crash

### Connection Pooling:
- Limits concurrent connections to prevent exhaustion
- Reuses connections efficiently
- Timeout prevents hanging connections

### Health Checks:
- Backend checks database connection every 30 seconds
- PostgreSQL health check every 10 seconds
- Automatic recovery if connection is lost

## Testing

### Test 1: Simulate Database Restart
```bash
# Restart database container
docker-compose restart postgres

# Backend should automatically reconnect
# Check logs: docker-compose logs -f backend
```

### Test 2: Check Health Endpoint
```bash
curl http://localhost:3001/health/ready
# Should return: {"status":"ready","checks":{"database":"ok"}}
```

### Test 3: Connection Recovery
```bash
# Stop database
docker stop millionaire-postgres

# Wait a few seconds

# Start database
docker start millionaire-postgres

# Backend should automatically reconnect
```

## Monitoring

### Check Connection Status:
```bash
# View backend logs
docker-compose logs -f backend | grep -i "database"

# View database logs
docker-compose logs -f postgres

# Check health
curl http://localhost:3001/health/ready
```

### Expected Log Messages:
- ✅ `Database connected successfully`
- ✅ `Attempting to connect to database...`
- ⚠️ `Failed to connect to database` (followed by retry)
- ✅ `Retrying connection in X seconds...`

## Troubleshooting

### If Database Still Fails:

1. **Check Database Container**:
   ```bash
   docker-compose ps postgres
   docker-compose logs postgres
   ```

2. **Check Backend Logs**:
   ```bash
   docker-compose logs backend | grep -i "database\|error"
   ```

3. **Verify Connection String**:
   ```bash
   docker-compose exec backend env | grep DATABASE_URL
   ```

4. **Test Database Connection**:
   ```bash
   docker-compose exec postgres psql -U postgres -d millionaire_game -c "SELECT 1;"
   ```

5. **Check Disk Space**:
   ```bash
   df -h
   # Database needs space in ./data/postgres
   ```

### Common Issues:

**Issue**: "Connection refused"
- **Fix**: Database container not running → `docker-compose restart postgres`

**Issue**: "Too many connections"
- **Fix**: Connection pool limits should prevent this, but check max_connections

**Issue**: "Connection timeout"
- **Fix**: Check network connectivity between containers

**Issue**: "Database not ready"
- **Fix**: Wait for health check to pass (30 seconds after container start)

## Files Modified

1. **`backend/src/prisma/prisma.service.ts`**
   - Added retry logic
   - Added health monitoring
   - Added connection state tracking

2. **`docker-compose.yml`**
   - Added restart policies
   - Added connection pooling
   - Enhanced health checks
   - Added PostgreSQL optimizations

3. **`backend/src/app.controller.ts`**
   - Improved health check endpoint
   - Uses PrismaService for connection checks

## Expected Behavior After Fix

✅ **Automatic Recovery**: Database connections recover automatically
✅ **No Manual Restart Needed**: System handles connection failures
✅ **Better Performance**: Connection pooling and PostgreSQL tuning
✅ **Health Monitoring**: Continuous connection health checks
✅ **Container Resilience**: Containers restart automatically on failure

## Next Steps

1. **Apply the fixes** (already done)
2. **Restart services**:
   ```bash
   docker-compose down
   docker-compose up -d
   ```
3. **Monitor logs**:
   ```bash
   docker-compose logs -f backend
   ```
4. **Test connection**:
   ```bash
   curl http://localhost:3001/health/ready
   ```

The database should now be much more stable and recover automatically from connection issues!

