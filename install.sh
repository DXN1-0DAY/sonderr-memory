#!/usr/bin/env bash
set -euo pipefail

REPO="DXN1-0DAY/sonderr-memory"
BIN_NAME="sonderr-memory"
INSTALL_DIR="${HOME}/.local/bin"
REPO_DIR="${HOME}/.sonderr-memory"

mkdir -p "${INSTALL_DIR}"

if ! command -v bun >/dev/null 2>&1; then
  echo "Bun not found. Installing Bun..."
  curl -fsSL https://bun.sh/install | bash
  export PATH="${HOME}/.bun/bin:${PATH}"
fi

if [ ! -d "${REPO_DIR}/.git" ]; then
  echo "cloning repo..."
  git clone --depth 1 "https://github.com/${REPO}.git" "${REPO_DIR}"
else
  echo "updating repo..."
  git -C "${REPO_DIR}" pull --ff-only
fi

echo "installing dependencies..."
cd "${REPO_DIR}"
bun install

echo "building C++23 manager..."
mkdir -p dist
g++ -std=c++23 -O2 -Wall -Wextra -Wpedantic cpp/main.cpp -o dist/sonderr-memory-tui

WRAPPER="${INSTALL_DIR}/${BIN_NAME}"
cat > "${WRAPPER}" <<EOF
#!/usr/bin/env bash
set -euo pipefail
REPO_DIR="${REPO_DIR}"
if [ ! -d "\${REPO_DIR}" ]; then
  echo "repo missing at \${REPO_DIR}" >&2
  exit 1
fi
cd "\${REPO_DIR}"
if [ "\$#" -eq 0 ]; then
  exec "\${REPO_DIR}/dist/sonderr-memory-tui"
fi
exec bun run src/main.ts "\$@"
EOF
chmod +x "${WRAPPER}"

if ! echo "${PATH}" | grep -q "${INSTALL_DIR}"; then
  echo ""
  echo "add this to your shell rc:"
  echo "  export PATH=\"${INSTALL_DIR}:\${PATH}\""
fi

echo "installed ${BIN_NAME} -> ${WRAPPER}"
echo "repo -> ${REPO_DIR}"
