#!/usr/bin/env bash
set -euo pipefail

status_ok() {
  printf '[OK] %s: %s\n' "$1" "$2"
}

status_warn() {
  printf '[WARN] %s: %s\n' "$1" "$2"
  if [ "$#" -ge 3 ] && [ -n "$3" ]; then
    printf '       Suggested: %s\n' "$3"
  fi
}

status_missing() {
  printf '[MISSING] %s: %s\n' "$1" "$2"
  if [ "$#" -ge 3 ] && [ -n "$3" ]; then
    printf '          Suggested: %s\n' "$3"
  fi
}

command_version() {
  local cmd="$1"
  shift
  if command -v "$cmd" >/dev/null 2>&1; then
    "$cmd" "$@" 2>/dev/null | head -n 1
    return 0
  fi
  return 1
}

check_command() {
  local label="$1"
  local cmd="$2"
  local suggestion="$3"
  shift 3

  local version
  if version="$(command_version "$cmd" "$@")"; then
    status_ok "$label" "$version"
  else
    status_missing "$label" "not found on PATH" "$suggestion"
  fi
}

check_playwright() {
  if [ -x "node_modules/.bin/playwright" ]; then
    local version
    version="$(node_modules/.bin/playwright --version 2>/dev/null | head -n 1 || true)"
    status_ok "project Playwright" "${version:-node_modules/.bin/playwright}"
    return
  fi

  if command -v playwright >/dev/null 2>&1; then
    local version
    version="$(playwright --version 2>/dev/null | head -n 1 || true)"
    status_warn "project Playwright" "not installed in this project" "npm install -D @playwright/test"
    status_ok "PATH Playwright" "${version:-$(command -v playwright)}"
    return
  fi

  status_warn "Playwright" "not available" "npm install -D @playwright/test"
}

check_chrome() {
  local candidates=(
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
    "/Applications/Chromium.app/Contents/MacOS/Chromium"
  )

  local path
  for path in "${candidates[@]}"; do
    if [ -x "$path" ]; then
      status_ok "Chrome/Chromium" "$path"
      return
    fi
  done

  local cmd
  for cmd in google-chrome chrome chromium chromium-browser; do
    if command -v "$cmd" >/dev/null 2>&1; then
      status_ok "Chrome/Chromium" "$(command -v "$cmd")"
      return
    fi
  done

  status_warn "Chrome/Chromium" "local browser not found" "npx playwright install chromium"
}

check_devtools_cli() {
  local cmd
  for cmd in chrome-devtools chrome-devtools-cli; do
    if command -v "$cmd" >/dev/null 2>&1; then
      status_ok "Chrome DevTools CLI" "$(command -v "$cmd")"
      return
    fi
  done

  status_warn "Chrome DevTools CLI" "optional diagnostic CLI not found" "configure an available Chrome DevTools CLI if deeper diagnosis is required"
}

main() {
  if [ "$#" -ne 0 ]; then
    printf 'Usage: %s\n' "$0" >&2
    exit 2
  fi

  printf 'Easy PRD Testing dependency check\n\n'

  check_command "node" "node" "install Node.js" "--version"
  check_command "npm" "npm" "install npm with Node.js" "--version"
  check_command "npx" "npx" "install npx with npm" "--version"

  if version="$(command_version python3 --version)"; then
    status_ok "python3" "$version"
  else
    status_warn "python3" "not found; validate-plugin.sh can still use node" "install Python 3 if node is unavailable"
  fi

  check_playwright
  check_chrome
  check_devtools_cli
  status_warn "Chrome DevTools MCP" "manual Codex host configuration check required" "enable the MCP server in the host environment when MCP diagnostics are needed"

  printf '\nNo installation was performed.\n'
  printf 'Ask the user before running any suggested install command.\n'
}

main "$@"
