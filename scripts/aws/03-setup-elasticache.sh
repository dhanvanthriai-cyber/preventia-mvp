#!/usr/bin/env bash
# =============================================================================
# 03-setup-elasticache.sh — Create ElastiCache Redis 7 (cache.t4g.micro)
# Run once. Safe to re-run — skips if already exists.
#
# Note: Redis OSS 7.x in ElastiCache no longer supports the appendonly /
# appendfsync parameters. Use the default Redis 7 parameter group.
# For this MVP, Redis is only used for session cache.
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1091
source "${SCRIPT_DIR}/aws-profile.sh"

REGION="ap-south-1"
CLUSTER_ID="preventia-redis"
NODE_TYPE="cache.t4g.micro"
ENGINE_VERSION="7.1"
PARAM_GROUP="default.redis7"

echo "=== Setting up ElastiCache Redis ==="

# --- Account guard ---
CALLER=$(aws sts get-caller-identity --query 'Account' --output text 2>/dev/null)
if [[ "$CALLER" != "246599827879" ]]; then
  echo "  ERROR: Wrong AWS account ($CALLER). Run: export AWS_PROFILE=preventia"
  exit 1
fi
echo "  Account: $CALLER ✓"

# --- Skip if already exists ---
if aws elasticache describe-cache-clusters \
    --cache-cluster-id "$CLUSTER_ID" \
    --region "$REGION" &>/dev/null; then
  echo "  ✓ Redis cluster $CLUSTER_ID already exists"
  ENDPOINT=$(aws elasticache describe-cache-clusters \
    --cache-cluster-id "$CLUSTER_ID" \
    --show-cache-node-info \
    --region "$REGION" \
    --query 'CacheClusters[0].CacheNodes[0].Endpoint.Address' \
    --output text)
  echo "  Endpoint: $ENDPOINT"
  exit 0
fi

echo "  Using parameter group: $PARAM_GROUP"

# --- Create the cluster ---
echo "  Creating ElastiCache cluster (takes ~3 minutes)…"

aws elasticache create-cache-cluster \
  --cache-cluster-id "$CLUSTER_ID" \
  --cache-node-type "$NODE_TYPE" \
  --engine redis \
  --engine-version "$ENGINE_VERSION" \
  --num-cache-nodes 1 \
  --cache-parameter-group-name "$PARAM_GROUP" \
  --region "$REGION" \
  --tags Key=project,Value=preventia Key=env,Value=prod > /dev/null

echo "  Waiting for Redis to become available…"
aws elasticache wait cache-cluster-available \
  --cache-cluster-id "$CLUSTER_ID" \
  --region "$REGION"

ENDPOINT=$(aws elasticache describe-cache-clusters \
  --cache-cluster-id "$CLUSTER_ID" \
  --show-cache-node-info \
  --region "$REGION" \
  --query 'CacheClusters[0].CacheNodes[0].Endpoint.Address' \
  --output text)

echo ""
echo "  ✓ Redis ready!"
echo "  Endpoint: $ENDPOINT:6379"
echo ""
echo "  → Add to .env.aws:"
echo "    REDIS_HOST=$ENDPOINT"
echo ""
echo "Run next: ./03a-setup-storage-iam.sh"
