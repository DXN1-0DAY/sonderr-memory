#!/usr/bin/env bash
set -euo pipefail

REPO="DXN1-0DAY/sonderr-memory"
BIN_NAME="sonderr-memory"
INSTALL_DIR="${HOME}/.local/bin"
APP_DIR="${HOME}/.local/share/sonderr-memory"
STORE_DIR="${HOME}/.sonderr-memory"

mkdir -p "${INSTALL_DIR}"

if ! command -v git >/dev/null 2>&1; then
  echo "git is required to install sonderr-memory." >&2
  exit 1
fi

if ! command -v bun >/dev/null 2>&1; then
  echo "Bun not found. Installing Bun..."
  curl -fsSL https://bun.sh/install | bash
  export PATH="${HOME}/.bun/bin:${PATH}"
fi

if [ ! -d "${APP_DIR}/.git" ]; then
  echo "cloning repo..."
  mkdir -p "$(dirname "${APP_DIR}")"
  git clone --depth 1 "https://github.com/${REPO}.git" "${APP_DIR}"
else
  echo "updating repo..."
  git -C "${APP_DIR}" pull --ff-only
fi

echo "installing dependencies..."
cd "${APP_DIR}"
bun install

echo "building C++23 manager..."
mkdir -p dist
if command -v g++ >/dev/null 2>&1; then
  g++ -std=c++23 -O2 -Wall -Wextra -Wpedantic cpp/main.cpp -o dist/sonderr-memory-tui
elif command -v clang++ >/dev/null 2>&1; then
  clang++ -std=c++23 -O2 -Wall -Wextra -Wpedantic cpp/main.cpp -o dist/sonderr-memory-tui
else
  echo "A C++23 compiler (g++ or clang++) is required." >&2
  exit 1
fi

mkdir -p "${STORE_DIR}"

WRAPPER="${INSTALL_DIR}/${BIN_NAME}"
cat > "${WRAPPER}" <<EOF
#!/usr/bin/env bash
set -euo pipefail
APP_DIR="${APP_DIR}"
STORE_DIR="${STORE_DIR}"
if [ ! -d "\${APP_DIR}" ]; then
  echo "installation missing at \${APP_DIR}" >&2
  exit 1
fi
cd "\${APP_DIR}"
export SONDERR_MEMORY_ROOT="\${STORE_DIR}"
if [ "\$#" -eq 0 ]; then
  exec "\${APP_DIR}/dist/sonderr-memory-tui"
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
echo "application -> ${APP_DIR}"
echo "memory store -> ${STORE_DIR}"
