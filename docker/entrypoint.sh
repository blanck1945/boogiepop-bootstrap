#!/bin/sh
set -u

TF_DIR="${INFRA_TERRAFORM_DIR:-/mnt/efs/terraform}"
mkdir -p "$TF_DIR"

sync_infra_from_git() {
  CLONE_URL="$INFRA_GIT_REPO"
  if [ -n "${GITLAB_INFRA_TOKEN:-}" ]; then
    CLONE_URL=$(printf '%s' "$INFRA_GIT_REPO" | sed "s|https://|https://oauth2:${GITLAB_INFRA_TOKEN}@|")
  fi
  TMP="/tmp/infra-clone.$$"
  BRANCH="${INFRA_GIT_BRANCH:-main}"
  git clone --depth 1 -b "$BRANCH" "$CLONE_URL" "$TMP"
  rm -rf "$TF_DIR"/*
  (cd "$TMP/terraform" && tar cf - .) | (cd "$TF_DIR" && tar xf -)
  rm -rf "$TMP"
}

if [ -n "${INFRA_GIT_REPO:-}" ]; then
  if [ ! -f "$TF_DIR/versions.tf" ] || [ ! -f "$TF_DIR/ecs.tf" ]; then
    sync_infra_from_git
  elif [ -d "$TF_DIR/.git" ]; then
    cd "$TF_DIR"
    git pull --ff-only || true
  fi
fi

exec node dist/main.js
