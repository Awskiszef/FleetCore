#!/bin/sh
set -e

echo "Pushing database schema..."
npx prisma db push

echo "Starting backend..."
exec npm run start:prod
