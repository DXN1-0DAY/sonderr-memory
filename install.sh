#!/usr/bin/env bash
set -euo pipefail

REPO="DXN1-termux/sonderr-memory"
BIN_NAME="sonderr-memory"
INSTALL_DIR="${HOME}/.local/bin"

case "$(uname -s)" in
  Linux) OS="linux" ;;
  Darwin) OS="darwin" ;;
  *) echo "unsupported OS"; exit 1 ;;
esac

ARCH="$(uname -m)"
case "$ARCH" in
  x86_64) ARCH="x64" ;;
  aarch64|arm64) ARCH="arm64" ;;
esac

ASSET="${BIN_NAME}-${OS}-${ARCH}"
mkdir -p "${INSTALL_DIR}"

echo "fetching latest release..."
URL="https://github.com/${REPO}/releases/latest/download/${ASSET}"
TMP="$(mktemp)"

curl -fL "${URL}" -o "${TMP}"
chmod +x "${TMP}"
mv "${TMP}" "${INSTALL_DIR}/${BIN_NAME}"

if ! echo "${PATH}" | grep -q "${INSTALL_DIR}"; then
  echo ""
  echo "add this to your shell rc:"
  echo "  export PATH=\"${INSTALL_DIR}:\${PATH}\""
fi

echo "installed ${BIN_NAME} -> ${INSTALL_DIR}/${BIN_NAME}"
