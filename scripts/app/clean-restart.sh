#!/usr/bin/env bash
# clean-restart.sh — Stop all Preventia containers, fix DB state, restart cleanly.
# Safe to run any time — idempotent.
#
# Usage:
#   cd /Users/satishjonnala/Documents/Dhanvantri/dhanvanthri-mvp/eng
#   bash clean-restart.sh

set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")"

set -a; source .env; set +a

echo "================================================"
echo " Preventia — Clean Restart"
echo "================================================"
echo ""

# ── Step 1: Stop app (leave DB/Redis running to preserve data) ──
echo "▶ Step 1/4: Stopping app container..."
podman stop  preventia-app 2>/dev/null || true
podman rm    preventia-app 2>/dev/null || true
echo "  done"
echo ""

# ── Step 2: Ensure postgres + redis are up ──────────────
echo "▶ Step 2/4: Ensuring postgres + redis are running..."
podman start preventia-postgres preventia-redis 2>/dev/null || \
  (cd "$(dirname "${BASH_SOURCE[0]}")" && podman compose up -d postgres redis 2>&1)
sleep 8
echo "  done"
echo ""

# ── Step 3: Fix ALL Flyway checksums + ensure preventia_db ─
echo "▶ Step 3/4: Fixing database state..."

# Rename DB if still called dhanvanthri_db
podman exec preventia-postgres psql -U dhan_dev -d postgres -c "
DO \$\$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_database WHERE datname='dhanvanthri_db') AND
     NOT EXISTS (SELECT 1 FROM pg_database WHERE datname='preventia_db') THEN
    ALTER DATABASE dhanvanthri_db RENAME TO preventia_db;
    RAISE NOTICE 'Renamed dhanvanthri_db -> preventia_db';
  END IF;
END \$\$;" 2>&1 | grep -v "^$" || true

# Fix all Flyway checksums to match the current JAR
podman exec preventia-postgres psql -U dhan_dev -d preventia_db -c "
UPDATE flyway_schema_history SET checksum = -438484024  WHERE version='1'  AND checksum != -438484024;
UPDATE flyway_schema_history SET checksum =  156745155  WHERE version='2'  AND checksum !=  156745155;
UPDATE flyway_schema_history SET checksum = 2016684492  WHERE version='3'  AND checksum != 2016684492;
UPDATE flyway_schema_history SET checksum =  810133121  WHERE version='4'  AND checksum !=  810133121;
UPDATE flyway_schema_history SET checksum = 1762390000  WHERE version='5'  AND checksum != 1762390000;
UPDATE flyway_schema_history SET checksum = -310200230  WHERE version='6'  AND checksum != -310200230;
UPDATE flyway_schema_history SET checksum = 1040558633  WHERE version='7'  AND checksum != 1040558633;
UPDATE flyway_schema_history SET checksum = -1867127128 WHERE version='11' AND checksum != -1867127128;
SELECT 'Flyway checksums OK' AS status;" 2>&1 | grep -v "^$"

# Ensure admin user exists
HASH='$2b$10$wG8mun1I0nZUBI.R9OwNA.MQzkiyIEoJTQ5tlmhWXcJF0H0OuNW2a'
podman exec preventia-postgres psql -U dhan_dev -d preventia_db -c "
INSERT INTO users (name, email, password, role)
VALUES ('Platform Admin', 'admin@dhanvanthri.local', '${HASH}', 'ADMIN')
ON CONFLICT (email) DO UPDATE SET role='ADMIN', password=EXCLUDED.password;
SELECT 'Admin user OK' AS status;" 2>&1 | grep -v "^$"

echo "  done"
echo ""

# ── Step 4: Start app + health check ────────────────────
echo "▶ Step 4/4: Starting app..."
bash start-app.sh
