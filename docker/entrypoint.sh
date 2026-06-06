#!/bin/sh
set -eu

TF_DIR="${INFRA_TERRAFORM_DIR:-/mnt/efs/terraform}"
mkdir -p "$TF_DIR"

if [ -n "${INFRA_GIT_REPO:-}" ]; then
  if [ ! -f "$TF_DIR/versions.tf" ]; then
    CLONE_URL="$INFRA_GIT_REPO"
    if [ -n "${GITLAB_INFRA_TOKEN:-}" ]; then
      CLONE_URL=$(printf '%s' "$INFRA_GIT_REPO" | sed "s|https://|https://oauth2:${GITLAB_INFRA_TOKEN}@|")
    fi
    TMP="/tmp/infra-clone.$$"
    BRANCH="${INFRA_GIT_BRANCH:-main}"
    git clone --depth 1 -b "$BRANCH" "$CLONE_URL" "$TMP"
    cp -a "$TMP/terraform/." "$TF_DIR/"
    rm -rf "$TMP"
  elif [ -d "$TF_DIR/.git" ]; then
    cd "$TF_DIR"
    git pull --ff-only || true
  fi
fi

exec node dist/main.js
