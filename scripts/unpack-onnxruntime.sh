#!/usr/bin/env bash
# Unpack the vendored ONNX Runtime that Linux builds link against dynamically.
#
# ort-sys would otherwise download its own runtime at compile time. The
# tarball is committed in vendor/onnxruntime so the build needs no network;
# this script unpacks it into src-tauri/onnxruntime (gitignored), where
# .cargo/config.toml points ORT_LIB_LOCATION and tauri.conf.json picks up
# libonnxruntime.so.1 for the deb. The hash check guards against a corrupted
# checkout, not against the network.
#
# Idempotent: re-running with the right version already unpacked is a no-op.
set -euo pipefail

ORT_VERSION="1.24.2"
ORT_SHA256="7e8062d5cda514fe3e31d805f9aabd50bed42d331994f66753d2dd697294b976"

root="$(cd "$(dirname "$0")/.." && pwd)"
tarball="$root/vendor/onnxruntime/onnxruntime-linux-x86_64-${ORT_VERSION}.tgz"
dest="$root/src-tauri/onnxruntime"
marker="$dest/.version"

if [ -f "$marker" ] && [ "$(cat "$marker")" = "$ORT_VERSION" ]; then
  echo "ONNX Runtime $ORT_VERSION already present in $dest"
  exit 0
fi

echo "$ORT_SHA256  $tarball" | sha256sum --check --quiet

rm -rf "$dest"
mkdir -p "$dest"
# The tarball is produced on macOS: drop its AppleDouble "._*" sidecar files.
tar xzf "$tarball" --strip-components=1 -C "$dest" --exclude='._*' 2>/dev/null

# The deb bundler copies files, not symlinks: make every alias a real file so
# libonnxruntime.so.1 (the SONAME the binary needs) is a complete library.
for f in "$dest"/lib/libonnxruntime.so*; do
  if [ -L "$f" ]; then
    cp -L "$f" "$f.real" && mv "$f.real" "$f"
  fi
done

echo "$ORT_VERSION" > "$marker"
echo "ONNX Runtime $ORT_VERSION unpacked into $dest"
