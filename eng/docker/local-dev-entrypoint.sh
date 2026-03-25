#!/bin/sh

set -eu

TRUSTSTORE_PATH="${DAILY_DYNAMIC_TRUSTSTORE_PATH:-/app/dev-cacerts}"
TRUSTSTORE_PASSWORD="${DAILY_DYNAMIC_TRUSTSTORE_PASSWORD:-changeit}"
TLS_HOST="${DAILY_DYNAMIC_CA_IMPORT_HOST:-api.daily.co}"
TLS_PORT="${DAILY_DYNAMIC_CA_IMPORT_PORT:-443}"
IMPORT_ENABLED="${DAILY_DYNAMIC_CA_IMPORT_ENABLED:-true}"
DAILY_API_KEY_VALUE="${DAILY_API_KEY:-}"

log() {
  printf '%s\n' "$*"
}

is_truthy() {
  case "$(printf '%s' "$1" | tr '[:upper:]' '[:lower:]')" in
    1|true|yes|on)
      return 0
      ;;
    *)
      return 1
      ;;
  esac
}

is_stub_key() {
  case "$1" in
    ""|STUB*)
      return 0
      ;;
    *)
      return 1
      ;;
  esac
}

ensure_truststore_flags() {
  truststore_flags="-Djavax.net.ssl.trustStore=${TRUSTSTORE_PATH} -Djavax.net.ssl.trustStorePassword=${TRUSTSTORE_PASSWORD}"
  if [ -n "${JAVA_TOOL_OPTIONS:-}" ]; then
    export JAVA_TOOL_OPTIONS="${JAVA_TOOL_OPTIONS} ${truststore_flags}"
  else
    export JAVA_TOOL_OPTIONS="${truststore_flags}"
  fi
}

import_live_daily_ca_chain() {
  tmp_dir="$(mktemp -d)"

  cleanup() {
    rm -rf "$tmp_dir"
  }
  trap cleanup EXIT HUP INT TERM

  log "[local-dev-entrypoint] Importing live CA chain for ${TLS_HOST}:${TLS_PORT} into ${TRUSTSTORE_PATH}"

  if ! keytool -printcert -sslserver "${TLS_HOST}:${TLS_PORT}" -rfc > "${tmp_dir}/chain.pem" 2>"${tmp_dir}/chain.err"; then
    log "[local-dev-entrypoint] WARNING: could not fetch the live certificate chain for ${TLS_HOST}:${TLS_PORT}"
    sed -n '1,5p' "${tmp_dir}/chain.err" || true
    return 0
  fi

  awk -v outdir="$tmp_dir" '
    /-----BEGIN CERTIFICATE-----/ {
      file = sprintf("%s/cert-%02d.pem", outdir, ++count)
    }
    file != "" {
      print >> file
    }
    /-----END CERTIFICATE-----/ {
      close(file)
      file = ""
    }
  ' "${tmp_dir}/chain.pem"

  imported_any="false"
  found_any="false"

  for cert_file in "${tmp_dir}"/cert-*.pem; do
    if [ ! -e "$cert_file" ]; then
      break
    fi

    found_any="true"

    if ! openssl x509 -in "$cert_file" -noout -text 2>/dev/null | grep -q 'CA:TRUE'; then
      continue
    fi

    fingerprint="$(openssl x509 -in "$cert_file" -noout -fingerprint -sha256 | sed 's/.*=//' | tr -d ':' | tr '[:upper:]' '[:lower:]')"
    alias_name="daily-live-$(printf '%s' "$fingerprint" | cut -c1-12)"

    if keytool -list -keystore "$TRUSTSTORE_PATH" -storepass "$TRUSTSTORE_PASSWORD" -alias "$alias_name" >/dev/null 2>&1; then
      continue
    fi

    subject="$(openssl x509 -in "$cert_file" -noout -subject | sed 's/^subject=//')"
    keytool -importcert -noprompt \
      -keystore "$TRUSTSTORE_PATH" \
      -storepass "$TRUSTSTORE_PASSWORD" \
      -alias "$alias_name" \
      -file "$cert_file" >/dev/null
    log "[local-dev-entrypoint] Imported ${alias_name} ${subject}"
    imported_any="true"
  done

  if [ "$found_any" = "false" ]; then
    log "[local-dev-entrypoint] WARNING: no certificates were extracted from the live chain output"
  elif [ "$imported_any" = "false" ]; then
    log "[local-dev-entrypoint] No new live CA certificates needed for ${TLS_HOST}:${TLS_PORT}"
  fi
}

ensure_truststore_flags

if is_truthy "$IMPORT_ENABLED" && ! is_stub_key "$DAILY_API_KEY_VALUE"; then
  import_live_daily_ca_chain
else
  log "[local-dev-entrypoint] Skipping live Daily CA import (enabled=${IMPORT_ENABLED}, stubMode=$(is_stub_key "$DAILY_API_KEY_VALUE" && printf true || printf false))"
fi

exec sh -c 'java $JAVA_OPTS -jar app.jar'
