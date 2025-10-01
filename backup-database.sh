#!/bin/bash

# 🛡️ Database Backup Script
# This script creates a backup of your game show database

echo "🔄 Creating database backup..."

# Create backup directory if it doesn't exist
mkdir -p backups

# Create timestamp for backup file
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="backups/gameshow_backup_${TIMESTAMP}.sql"

# Create the backup
docker-compose exec -T postgres pg_dump -U postgres millionaire_game > "$BACKUP_FILE"

if [ $? -eq 0 ]; then
    echo "✅ Backup created successfully: $BACKUP_FILE"
    echo "📊 Backup size: $(du -h "$BACKUP_FILE" | cut -f1)"
    echo "📅 Created: $(date)"
else
    echo "❌ Backup failed!"
    exit 1
fi

echo "🎯 To restore this backup later, run:"
echo "   docker-compose exec -T postgres psql -U postgres millionaire_game < $BACKUP_FILE"
