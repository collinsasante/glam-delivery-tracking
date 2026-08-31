#!/usr/bin/env bash
# Nightly Postgres backup — run via VPS cron, e.g.:
#   0 3 * * * cd /path/to/app && docker/backup-db.sh >> /var/log/glam-backup.log 2>&1
#
# Dumps the `db` container's database, gzips it, uploads to the app's own S3
# bucket under backups/, and prunes local copies older than 14 days. Requires
# the AWS CLI on the host (not inside a container) with credentials scoped to
# a SEPARATE backup-only IAM policy (s3:PutObject on backups/* only) — do not
# reuse the app's upload-only credentials here since they lack ListBucket/etc,
# and don't give the running app container backup-write access either.
set -euo pipefail
cd "$(dirname "$0")/.."

set -a; source .env.production; set +a

TIMESTAMP="$(date +%Y-%m-%dT%H-%M-%S)"
BACKUP_DIR="./backups"
FILENAME="glam-delivery-${TIMESTAMP}.dump.gz"

mkdir -p "$BACKUP_DIR"

docker compose exec -T db pg_dump -U glam -d glam_delivery --format=custom | gzip > "${BACKUP_DIR}/${FILENAME}"

aws s3 cp "${BACKUP_DIR}/${FILENAME}" "s3://${S3_BUCKET_NAME}/backups/${FILENAME}"

# Keep 14 days of local copies; S3 lifecycle rules (configured separately on the
# bucket) should handle longer-term retention/expiry.
find "$BACKUP_DIR" -name '*.dump.gz' -mtime +14 -delete

echo "Backup complete: ${FILENAME}"
