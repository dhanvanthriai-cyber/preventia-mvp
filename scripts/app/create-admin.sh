#!/usr/bin/env bash
# create-admin.sh — Insert the platform admin user directly into the DB.
# Safe to run multiple times (uses INSERT ... ON CONFLICT DO UPDATE).
#
# Usage:
#   cd /Users/satishjonnala/Documents/Dhanvantri/preventia-mvp/eng
#   bash create-admin.sh

set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")"

# BCrypt hash of "Admin@1234" (cost=10)
HASH='$2b$10$wG8mun1I0nZUBI.R9OwNA.MQzkiyIEoJTQ5tlmhWXcJF0H0OuNW2a'

echo "▶ Inserting admin user into preventia_db..."

podman exec preventia-postgres psql -U dhan_dev -d preventia_db -c \
  "INSERT INTO users (name, email, password, role)
   VALUES ('Platform Admin', 'admin@preventia.local', '${HASH}', 'ADMIN')
   ON CONFLICT (email) DO UPDATE
     SET password = EXCLUDED.password,
         role     = EXCLUDED.role,
         name     = EXCLUDED.name;
   SELECT id, name, email, role, created_at FROM users WHERE email = 'admin@preventia.local';"

echo ""
echo "✅ Admin user ready"
echo "   Email:    admin@preventia.local"
echo "   Password: Admin@1234"
echo "   URL:      http://localhost:3000/login?role=ADMIN"

