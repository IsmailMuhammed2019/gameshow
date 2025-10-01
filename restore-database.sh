#!/bin/bash

# 🔄 Database Restore Script
# This script restores your game show database from a backup

if [ $# -eq 0 ]; then
    echo "❌ Please provide a backup file to restore from"
    echo "Usage: ./restore-database.sh <backup_file>"
    echo "Example: ./restore-database.sh backups/gameshow_backup_20240101_120000.sql"
    exit 1
fi

BACKUP_FILE="$1"

if [ ! -f "$BACKUP_FILE" ]; then
    echo "❌ Backup file not found: $BACKUP_FILE"
    exit 1
fi

echo "🔄 Restoring database from: $BACKUP_FILE"
echo "⚠️  This will REPLACE all current data!"

# Ask for confirmation
read -p "Are you sure you want to continue? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Restore cancelled"
    exit 1
fi

# Stop the application
echo "🛑 Stopping application..."
docker-compose down

# Wait a moment for containers to stop
sleep 2

# Start only the database
echo "🗄️ Starting database..."
docker-compose up -d postgres

# Wait for database to be ready
echo "⏳ Waiting for database to be ready..."
sleep 10

# Restore the backup
echo "🔄 Restoring backup..."
docker-compose exec -T postgres psql -U postgres millionaire_game < "$BACKUP_FILE"

if [ $? -eq 0 ]; then
    echo "✅ Database restored successfully!"
    
    # Start the full application
    echo "🚀 Starting application..."
    docker-compose up -d
    
    echo "🎉 Application restored and running!"
    echo "🌐 Access your app at: http://94.237.53.19:3000"
else
    echo "❌ Restore failed!"
    exit 1
fi
