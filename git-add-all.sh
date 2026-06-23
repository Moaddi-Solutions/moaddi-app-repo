#!/usr/bin/env bash
# Stage all workspace files in the root repo without nested .git metadata.
# Each project keeps its own .git — we hide it briefly so root git add works.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

PROJECTS=(moaddi-next moaddi-server vending_app)
HIDDEN=()

hide_nested_git() {
  for project in "${PROJECTS[@]}"; do
    if [[ -d "$project/.git" ]]; then
      mv "$project/.git" "$project/.git.local"
      HIDDEN+=("$project")
    fi
  done
}

restore_nested_git() {
  for project in "${HIDDEN[@]}"; do
    if [[ -d "$project/.git.local" ]]; then
      mv "$project/.git.local" "$project/.git"
    fi
  done
}

trap restore_nested_git EXIT

hide_nested_git
if [[ $# -eq 0 ]]; then
  git add .
else
  git add "$@"
fi

echo "Staged. Nested project .git folders were not added."
