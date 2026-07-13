#!/bin/bash
# Restore script for FleetCore Database
# Usage: ./restore.sh <path_to_backup_file>

set -e

if [ -z "$1" ]; then
  echo "Error: No backup file provided."
  echo "Usage: ./restore.sh <path_to_backup_file>"
  exit 1
fi

BACKUP_FILE="$1"
CONTAINER_NAME="fleetcore_db"

if [ ! -f "$BACKUP_FILE" ]; then
  echo "Error: File $BACKUP_FILE does not exist."
  exit 1
fi

echo "WARNING: This will drop and overwrite the current database."
read -p "Are you sure you want to proceed? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "Restore cancelled."
  exit 1
fi

echo "Starting restore process..."

# Unzip and pipe the SQL to the database
gunzip -c "$BACKUP_FILE" | docker exec -i "$CONTAINER_NAME" psql -U admin -d fleetcore

echo "Restore completed successfully!"
