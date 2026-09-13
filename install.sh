#!/usr/bin/env bash
set -euo pipefail

REPO="DXN1-termux/sonderr-memory"
BIN_NAME="sonderr-memory"
INSTALL_DIR="${HOME}/.local/bin"
ASSET="${BIN_NAME}-$(uname -s | tr '[:upper:]' '[:lower:]')-$(uname -m)"

case "$(uname -s)" in
  Linux) ASSET="${BIN_NAME}-linux-$(uname -m)" ;;
  Darwin) ASSET="${BIN_NAME}-darwin-$(uname -m)" ;;
  *) echo "unsupported OS"; exit 1 ;;
esac

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
