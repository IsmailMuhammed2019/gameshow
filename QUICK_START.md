# 🚀 Quick Start Guide

## Deploy in 3 Steps

### Step 1: Run Deployment Script
```bash
./quick-deploy.sh
```

### Step 2: Choose Your Deployment Type
- **Option 1**: Local machine only (testing)
- **Option 2**: Local network (phones, tablets, other computers)
- **Option 3**: Public server (accessible from internet)

### Step 3: Access Your App
Open the URL shown in your browser!

---

## Access URLs

After deployment, you'll see something like:

```
Frontend:  http://YOUR_IP:3000
Backend:   http://YOUR_IP:3001
```

---

## Default Login

### Game Master (Host Games)
- Username: `admin`
- Password: `admin123`

### General Admin (Manage Content)
- Username: `general_admin`
- Password: `admin456`

---

## Mobile Access 📱

### Same WiFi Network
On your phone/tablet:
1. Connect to same WiFi
2. Open browser
3. Go to: `http://YOUR_IP:3000`

### From Internet
1. Use your public IP
2. Go to: `http://PUBLIC_IP:3000`

---

## Useful Commands

```bash
# Check if running
docker-compose ps

# View logs
docker-compose logs -f

# Stop everything
docker-compose down

# Restart
docker-compose restart

# Validate deployment
./validate-deployment.sh
```

---

## Troubleshooting

### Can't access from other devices?
1. Check firewall: `sudo ufw status`
2. Allow ports: `sudo ufw allow 3000` and `sudo ufw allow 3001`
3. Restart: `docker-compose restart`

### Services not starting?
```bash
# Check logs
docker-compose logs -f

# Try rebuilding
docker-compose down
docker-compose up -d --build
```

### "CORS error" in browser?
Check your `.env` file has correct ALLOWED_ORIGINS:
```bash
cat .env | grep ALLOWED_ORIGINS
```

---

## What Next?

1. **Login** as admin
2. **Create Episodes** (General Admin)
3. **Add Questions** to episodes
4. **Start Game** (Game Master)
5. **Invite Players** - share the URL!

---

## Need More Help?

- **Full Guide**: [DEPLOYMENT.md](DEPLOYMENT.md)
- **Changes Made**: [DEPLOYMENT_CHANGES.md](DEPLOYMENT_CHANGES.md)
- **Validate**: Run `./validate-deployment.sh`

---

## Architecture

```
┌─────────────────────┐
│   Your Devices      │
│ Phones, Tablets, PC │
└──────────┬──────────┘
           │
           ↓
┌─────────────────────┐
│   Frontend :3000    │
└──────────┬──────────┘
           │
           ↓
┌─────────────────────┐
│   Backend :3001     │
└──────────┬──────────┘
           │
           ↓
┌─────────────────────┐
│   Database :5432    │
└─────────────────────┘
```

---

## System Requirements

- **Docker** & **Docker Compose**
- **2GB RAM** minimum
- **5GB disk space**
- **Ports 3000, 3001** available

---

## Quick Deploy Summary

| Deployment Type | Access From | Example URL |
|----------------|-------------|-------------|
| Local | Same computer | http://localhost:3000 |
| Network | Same WiFi | http://192.168.1.100:3000 |
| Public | Anywhere | http://94.237.53.19:3000 |

---

**That's it! You're ready to host your game show! 🎉**

