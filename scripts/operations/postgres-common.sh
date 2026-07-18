#!/usr/bin/env bash

postgres_cli_url() {
  local url="$1"
  printf '%s' "$url" | sed -E \
    -e 's/([?&])schema=[^&]*&?/\1/' \
    -e 's/\?&/?/' \
    -e 's/[?&]$//'
}
