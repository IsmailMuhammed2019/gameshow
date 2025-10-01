# 🛡️ Data Persistence Guide - Your Data is SAFE!

## ✅ **Your Data WILL Persist - Here's Why:**

### **🔒 Database Persistence**
- ✅ **PostgreSQL volume is persistent** (`postgres_data:/var/lib/postgresql/data`)
- ✅ **Data survives container restarts** (`docker-compose restart`)
- ✅ **Data survives container rebuilds** (`docker-compose up --build`)
- ✅ **Data survives system reboots**
- ✅ **Only lost if you run `docker-compose down -v`** (removes volumes)

### **🔄 Automatic Data Recovery**
- ✅ **Automatic seeding on startup** - ensures test users always exist
- ✅ **Database migrations run automatically** - schema stays up-to-date
- ✅ **No manual intervention needed** - everything happens automatically

## 🚨 **What WILL Cause Data Loss (AVOID THESE):**

### ❌ **DANGER COMMANDS (Don't Use These):**
```bash
# ❌ NEVER run these - they DELETE your data:
docker-compose down -v          # Removes ALL volumes (data gone!)
docker volume prune            # Removes unused volumes
docker system prune -a        # Nuclear option - removes everything
```

### ✅ **SAFE COMMANDS (Use These Instead):**
```bash
# ✅ SAFE - preserves your data:
docker-compose restart         # Restarts containers, keeps data
docker-compose up --build     # Rebuilds containers, keeps data
docker-compose down            # Stops containers, keeps data
docker-compose up -d           # Starts containers, keeps data
```

## 🛡️ **Data Protection Features**

### **1. Persistent Volume**
```yaml
volumes:
  - postgres_data:/var/lib/postgresql/data  # ✅ Your data lives here
```

### **2. Automatic Seeding**
```yaml
command: >
  sh -c "
    npx prisma migrate deploy &&    # ✅ Updates schema
    npx prisma db seed &&            # ✅ Creates test users
    npm run start:dev                # ✅ Starts app
  "
```

### **3. Database Health Checks**
```yaml
healthcheck:
  test: ["CMD-SHELL", "pg_isready -U postgres"]
  interval: 10s
  timeout: 5s
  retries: 5
```

## 📊 **Current Data Status**

### **✅ Users (6 total):**
- `admin` / `admin123` (Game Master)
- `general_admin` / `admin456` (General Admin)
- `participant1` / `participant123` (Participant)
- `participant2` / `participant123` (Participant)
- `audience1` / `audience123` (Audience)
- `audience2` / `audience123` (Audience)

### **✅ Episodes (4 total):**
- General Knowledge (PARTICIPANT)
- Science & Technology (PARTICIPANT)
- History & Geography (AUDIENCE)
- Sports & Entertainment (AUDIENCE)

### **✅ Questions:**
- Automatically created within episodes
- Role-specific (participant vs audience)
- Difficulty-based timers

## 🔄 **What Happens When You:**

### **Create New Users:**
- ✅ **Stored in persistent database**
- ✅ **Survives container restarts**
- ✅ **Available immediately after restart**

### **Create New Episodes:**
- ✅ **Stored in persistent database**
- ✅ **Visible in General Admin portal**
- ✅ **Available in Game Master portal**

### **Add Questions to Episodes:**
- ✅ **Linked to specific episodes**
- ✅ **Role-specific (participant/audience)**
- ✅ **Persistent across restarts**

## 🚀 **Testing Data Persistence**

### **Test 1: Container Restart**
```bash
docker-compose restart
# ✅ All your data should still be there
```

### **Test 2: Container Rebuild**
```bash
docker-compose down
docker-compose up --build -d
# ✅ All your data should still be there
```

### **Test 3: System Reboot**
```bash
# After server reboot:
docker-compose up -d
# ✅ All your data should still be there
```

## 🆘 **If You Accidentally Lose Data**

### **Quick Recovery:**
```bash
# 1. Stop containers
docker-compose down

# 2. Start containers (will auto-seed)
docker-compose up -d

# 3. Check data is restored
docker-compose exec -T postgres psql -U postgres -d millionaire_game -c "SELECT COUNT(*) FROM users;"
```

## 📋 **Best Practices**

### **✅ DO:**
- Use `docker-compose restart` for quick fixes
- Use `docker-compose up --build` for code changes
- Create users through the app (they'll persist)
- Create episodes through General Admin (they'll persist)
- Add questions through General Admin (they'll persist)

### **❌ DON'T:**
- Run `docker-compose down -v` unless you want to lose everything
- Delete the `postgres_data` volume
- Run `docker volume prune` without checking what it removes

## 🎯 **Summary**

**Your data is SAFE!** The application is designed with multiple layers of data protection:

1. **Persistent PostgreSQL volume** - your data lives outside containers
2. **Automatic seeding** - test users always available
3. **Automatic migrations** - schema stays current
4. **Role-based data organization** - clean separation of concerns

**You can confidently create users, episodes, and questions - they will persist!** 🎉

---
*This guide ensures you understand exactly how your data is protected and what to avoid.*
