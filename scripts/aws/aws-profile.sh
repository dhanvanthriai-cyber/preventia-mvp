#!/usr/bin/env bash

# Resolve the AWS CLI profile for this workspace.
# Preference order:
# 1. Honor an explicitly exported AWS_PROFILE
# 2. Use the renamed profile if it exists
# 3. Fall back to the legacy profile that existing environments still use
# 4. Fall back to default if present
if [[ -z "${AWS_PROFILE:-}" ]]; then
  AVAILABLE_PROFILES="$(aws configure list-profiles 2>/dev/null || true)"

  if printf '%s\n' "$AVAILABLE_PROFILES" | grep -qx 'preventia'; then
    export AWS_PROFILE="preventia"
  elif printf '%s\n' "$AVAILABLE_PROFILES" | grep -qx 'default'; then
    export AWS_PROFILE="default"
  fi
fi
