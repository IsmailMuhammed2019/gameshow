# 🚀 Deployment Guide - Millionaire Game Show

This guide will help you deploy the Millionaire Game Show on **any system** - whether it's your local machine, a server on your network, or a public cloud server.

---

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Quick Start](#quick-start)
3. [Configuration](#configuration)
4. [Deployment Scenarios](#deployment-scenarios)
5. [Validation](#validation)
6. [Troubleshooting](#troubleshooting)
7. [Production Checklist](#production-checklist)
8. [Updating](#updating)

---

## Prerequisites

### Required Software

- **Docker** (version 20.10+)
- **Docker Compose** (version 2.0+)
- **Git** (for cloning the repository)

### System Requirements

- **CPU**: 2+ cores recommended
- **RAM**: 4GB minimum, 8GB recommended
- **Storage**: 10GB free space
- **Network**: Open ports 3000, 3001, 5432

### Installing Docker

**Ubuntu/Debian:**
```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
```

**Windows/Mac:**
Download and install [Docker Desktop](https://www.docker.com/products/docker-desktop/)

---

## Quick Start

### 1. Clone the Repository

```bash
git clone <repository-url>
cd gameshow
```

### 2. Configure Environment

```bash
# Copy the environment template
cp env.template .env

# Edit the configuration
nano .env  # or use your preferred editor
```

### 3. Run the Deployment Script

```bash
./deploy.sh
```

That's it! The script will:
- ✅ Detect your system configuration
- ✅ Build Docker containers
- ✅ Start all services
- ✅ Run database migrations
- ✅ Seed initial data
- ✅ Validate the deployment

---

## Configuration

### Environment Variables

Edit the `.env` file with your settings:

```bash
# Server configuration
SERVER_HOST=your-ip-or-domain
BACKEND_PORT=3001
FRONTEND_PORT=3000

# Security
JWT_SECRET=your-super-secret-key  # Generate with: openssl rand -base64 32

# URLs
NEXT_PUBLIC_API_URL=http://your-ip:3001
NEXT_PUBLIC_WS_URL=http://your-ip:3001
ALLOWED_ORIGINS=http://your-ip:3000,http://your-ip:3001

# Database
POSTGRES_PASSWORD=change-this-password
```

### Generating a Secure JWT Secret

```bash
openssl rand -base64 32
```

---

## Deployment Scenarios

### Scenario 1: Local Development

Perfect for testing on your own machine.

```bash
# .env configuration
SERVER_HOST=localhost
FRONTEND_URL=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_WS_URL=http://localhost:3001
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001
NODE_ENV=development
```

**Access:**
- Frontend: http://localhost:3000
- Backend: http://localhost:3001

---

### Scenario 2: Local Network Deployment

Deploy on your local network (e.g., 192.168.1.100).

```bash
# Find your IP address
hostname -I  # Linux
ipconfig     # Windows
ifconfig     # Mac

# .env configuration
SERVER_HOST=192.168.1.100
FRONTEND_URL=http://192.168.1.100:3000
NEXT_PUBLIC_API_URL=http://192.168.1.100:3001
NEXT_PUBLIC_WS_URL=http://192.168.1.100:3001
ALLOWED_ORIGINS=http://192.168.1.100:3000,http://192.168.1.100:3001
NODE_ENV=production
```

**Access from any device on your network:**
- Frontend: http://192.168.1.100:3000
- Backend: http://192.168.1.100:3001

**Mobile devices:** Simply use the same URLs!

---

### Scenario 3: Public Server Deployment

Deploy on a public server (e.g., AWS, DigitalOcean, Azure).

```bash
# .env configuration
SERVER_HOST=94.237.53.19  # Your public IP
FRONTEND_URL=http://94.237.53.19:3000
NEXT_PUBLIC_API_URL=http://94.237.53.19:3001
NEXT_PUBLIC_WS_URL=http://94.237.53.19:3001
ALLOWED_ORIGINS=http://94.237.53.19:3000,http://94.237.53.19:3001
NODE_ENV=production
JWT_SECRET=your-generated-secure-key
POSTGRES_PASSWORD=secure-database-password
```

**Firewall Configuration:**
```bash
# Allow required ports
sudo ufw allow 3000/tcp  # Frontend
sudo ufw allow 3001/tcp  # Backend
sudo ufw allow 22/tcp    # SSH (keep for remote access)
sudo ufw enable
```

**Access from anywhere:**
- Frontend: http://94.237.53.19:3000
- Backend API: http://94.237.53.19:3001

---

### Scenario 4: Domain Name Deployment

Deploy with a custom domain (requires SSL certificate for production).

```bash
# .env configuration
SERVER_HOST=yourdomain.com
FRONTEND_URL=https://yourdomain.com
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
NEXT_PUBLIC_WS_URL=https://api.yourdomain.com
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com,https://api.yourdomain.com
NODE_ENV=production
```

**Note:** For HTTPS, you'll need to set up a reverse proxy (Nginx) with SSL certificates (Let's Encrypt).

---

## Validation

### Automated Validation

Run the validation script to check your deployment:

```bash
./validate-deployment.sh
```

This checks:
- ✅ Docker containers status
- ✅ Backend health endpoints
- ✅ Frontend accessibility
- ✅ Database connectivity
- ✅ Data seeding
- ✅ Environment configuration

### Manual Validation

1. **Check containers:**
   ```bash
   docker-compose ps
   ```
   All should show "Up"

2. **Check backend health:**
   ```bash
   curl http://localhost:3001/health
   ```

3. **Check frontend:**
   Open http://localhost:3000 in your browser

4. **Test login:**
   - Username: `admin`
   - Password: `admin123`

---

## Troubleshooting

### Issue: Port Already in Use

```bash
# Find what's using the port
sudo lsof -i :3000
sudo lsof -i :3001

# Kill the process or change ports in .env
BACKEND_PORT=3002
FRONTEND_PORT=3001
```

### Issue: Containers Not Starting

```bash
# Check logs
docker-compose logs -f

# Specific service
docker-compose logs backend
docker-compose logs frontend
docker-compose logs postgres
```

### Issue: Database Connection Failed

```bash
# Restart database
docker-compose restart postgres

# Wait 10 seconds then restart backend
sleep 10
docker-compose restart backend
```

### Issue: Cannot Access from Other Devices

1. **Check firewall:**
   ```bash
   sudo ufw status
   ```

2. **Verify ALLOWED_ORIGINS includes the IP:**
   ```bash
   grep ALLOWED_ORIGINS .env
   ```

3. **Restart containers:**
   ```bash
   docker-compose restart
   ```

### Issue: CORS Errors

Make sure your `.env` has the correct ALLOWED_ORIGINS:

```bash
# Must include ALL URLs that will access the API
ALLOWED_ORIGINS=http://192.168.1.100:3000,http://192.168.1.100:3001,http://localhost:3000
```

---

## Production Checklist

Before going to production:

- [ ] Change `JWT_SECRET` to a secure random value
- [ ] Change `POSTGRES_PASSWORD` to a strong password
- [ ] Set `NODE_ENV=production`
- [ ] Configure firewall rules
- [ ] Set up SSL certificates (for HTTPS)
- [ ] Configure backup strategy
- [ ] Set up monitoring/logging
- [ ] Test on all target devices
- [ ] Document custom configurations
- [ ] Create admin accounts with strong passwords
- [ ] Remove or secure test accounts

---

## Useful Commands

### Start/Stop

```bash
# Start all services
docker-compose up -d

# Stop all services
docker-compose down

# Restart all services
docker-compose restart

# Stop and remove all data (CAREFUL!)
docker-compose down -v
```

### Logs

```bash
# View all logs
docker-compose logs -f

# View specific service
docker-compose logs -f backend
docker-compose logs -f frontend

# Last 100 lines
docker-compose logs --tail=100
```

### Database Operations

```bash
# Backup database
./backup-database.sh

# Restore database
./restore-database.sh backups/gameshow_backup_YYYYMMDD_HHMMSS.sql

# Access database
docker-compose exec postgres psql -U postgres -d millionaire_game

# Reseed database
docker-compose exec backend npx prisma db seed
```

### Updates

```bash
# Pull latest code
git pull

# Rebuild and restart
docker-compose up -d --build

# Or use the deploy script
./deploy.sh
```

---

## Updating

### Update Application

```bash
# Stop services
docker-compose down

# Pull latest changes
git pull

# Rebuild and start
docker-compose up -d --build

# Validate
./validate-deployment.sh
```

### Update Database Schema

```bash
# Run migrations
docker-compose exec backend npx prisma migrate deploy

# Or if in development
docker-compose exec backend npx prisma migrate dev
```

---

## Default Credentials

### Admin Accounts

**Game Master:**
- Username: `admin`
- Password: `admin123`
- Access: Can host and control games

**General Admin:**
- Username: `general_admin`
- Password: `admin456`
- Access: Can manage episodes and questions

### Test Users

**Participants:**
- `participant1` / `participant123`
- `participant2` / `participant123`

**Audience:**
- `audience1` / `audience123`
- `audience2` / `audience123`

⚠️ **Change these passwords in production!**

---

## Support

### Logs Location

- Backend logs: `docker-compose logs backend`
- Frontend logs: `docker-compose logs frontend`
- Database logs: `docker-compose logs postgres`

### Health Checks

- Backend health: http://your-ip:3001/health
- Backend ready: http://your-ip:3001/health/ready
- Backend alive: http://your-ip:3001/health/live

### Get Help

1. Check logs: `docker-compose logs -f`
2. Run validation: `./validate-deployment.sh`
3. Check GitHub issues
4. Review this documentation

---

## Architecture

```
┌─────────────────────────────────────────────┐
│           Users (Web/Mobile)                │
└─────────────────┬───────────────────────────┘
                  │
                  ↓
        ┌─────────────────────┐
        │   Frontend (Next.js) │
        │   Port: 3000         │
        └─────────┬────────────┘
                  │
                  ↓
        ┌─────────────────────┐
        │   Backend (NestJS)   │
        │   Port: 3001         │
        │   + WebSocket        │
        └─────────┬────────────┘
                  │
                  ↓
        ┌─────────────────────┐
        │   PostgreSQL DB      │
        │   Port: 5432         │
        └─────────────────────┘
```

---

## Summary

Your Millionaire Game Show is now deployed and accessible from:

- **Same machine**: http://localhost:3000
- **Local network**: http://YOUR_LOCAL_IP:3000
- **Internet**: http://YOUR_PUBLIC_IP:3000
- **Mobile devices**: Same URLs as above!

The application will work on **any device** with a web browser - phones, tablets, laptops, desktops!

🎉 **Happy gaming!**

