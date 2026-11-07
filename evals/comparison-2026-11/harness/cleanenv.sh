#!/bin/bash
# Runs a command in a clean environment: credentials, proxy/CA settings and PATH only. Usage: cleanenv.sh <dir> <cmd...>
dir=$1; shift
cd "$dir" && exec env -i HOME=/tmp/bench/home PATH="$PATH" IS_SANDBOX=1 TERM=dumb \
  HTTPS_PROXY="$HTTPS_PROXY" https_proxy="$https_proxy" NO_PROXY="$NO_PROXY" no_proxy="$no_proxy" \
  NODE_EXTRA_CA_CERTS="$NODE_EXTRA_CA_CERTS" SSL_CERT_FILE="$SSL_CERT_FILE" REQUESTS_CA_BUNDLE="$REQUESTS_CA_BUNDLE" GIT_SSL_CAINFO="$GIT_SSL_CAINFO" \
  NPM_CONFIG_USERCONFIG="$NPM_CONFIG_USERCONFIG" npm_config_https_proxy="$npm_config_https_proxy" npm_config_noproxy="$npm_config_noproxy" \
  PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 NODE_OPTIONS=--use-openssl-ca npm_config_store_dir=/root/.local/share/pnpm/store/v10 ANTHROPIC_BASE_URL="$ANTHROPIC_BASE_URL" "$@"
