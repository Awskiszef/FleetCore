#!/bin/bash
# Backup script for FleetCore Database
# Usage: ./backup.sh

set -e

BACKUP_DIR="$(pwd)/backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
FILENAME="fleetcore_backup_${TIMESTAMP}.sql.gz"
CONTAINER_NAME="fleetcore_db"

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

echo "Starting backup of FleetCore database..."

# Run pg_dump inside the container and compress it
# Use the environment variables from the container to authenticate
docker exec -t "$CONTAINER_NAME" pg_dump -U admin -d fleetcore -c | gzip > "$BACKUP_DIR/$FILENAME"

echo "Backup completed successfully!"
echo "File saved to: $BACKUP_DIR/$FILENAME"
