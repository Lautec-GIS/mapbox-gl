#!/usr/bin/env bash
#
# Publish the built dist to an orphan branch (default: `dist`) that contains
# ONLY the distributable files — no source, no git history, no source maps.
#
# Why this exists:
#   Committing dist/ onto the source branch grew .git past 700MB, because every
#   rebuild adds another ~28MB snapshot to history. `npm install
#   git+ssh://...#<branch>` clones that whole history, which times out on slower
#   devices. This script instead rewrites a single-commit orphan branch each
#   time, so a consumer's shallow clone only ever pulls the current dist.
#
# Usage:
#   build/publish-dist-branch.sh            # build, then publish to `dist`
#   SKIP_BUILD=1 build/publish-dist-branch.sh   # reuse existing dist/
#   DIST_BRANCH=dist-piechart build/publish-dist-branch.sh
#   NO_PUSH=1 build/publish-dist-branch.sh  # build the branch locally, don't push
#
# Consumers then install with:
#   npm install git+ssh://git@github.com/LAUTEC-Systems/mapbox-gl.git#dist
set -euo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel)"
cd "$REPO_ROOT"

DIST_BRANCH="${DIST_BRANCH:-dist}"
REMOTE="${REMOTE:-origin}"

# 1. Build the full published package (mirrors the `prepublishOnly` script).
if [[ "${SKIP_BUILD:-0}" != "1" ]]; then
  npm run build-all
  npm run build-css
  npm run build-style-spec
  npm run build-dts
fi

[[ -f dist/mapbox-gl.js ]] || { echo "error: dist/mapbox-gl.js missing — did the build fail?" >&2; exit 1; }

SRC_BRANCH="$(git rev-parse --abbrev-ref HEAD)"
SRC_SHA="$(git rev-parse --short HEAD)"

# 2. Assemble the branch contents in a throwaway dir (working tree untouched).
STAGE="$(mktemp -d)"
trap 'rm -rf "$STAGE"' EXIT

mkdir -p "$STAGE/dist"
cp dist/mapbox-gl* "$STAGE/dist/"
cp -R dist/esm "$STAGE/dist/esm"
[[ -d dist/style-spec ]] && cp -R dist/style-spec "$STAGE/dist/style-spec"
[[ -f dist/package.json ]] && cp dist/package.json "$STAGE/dist/package.json"
cp LICENSE.txt "$STAGE/LICENSE.txt"

# Drop source maps — the biggest files and not needed at runtime.
find "$STAGE" -name '*.map' -delete

# 3. Trimmed package.json: no dev/build fields, but same entry points.
#    (All runtime deps are bundled into dist, so there are no `dependencies`.)
node -e '
  const fs = require("fs");
  const p = JSON.parse(fs.readFileSync("package.json", "utf8"));
  for (const k of ["devDependencies", "workspaces", "scripts", "size-limit", "files", "engines"]) delete p[k];
  fs.writeFileSync(process.argv[1], JSON.stringify(p, null, 2) + "\n");
' "$STAGE/package.json"

# 4. Write a fresh single (parent-less) commit and point the branch at it.
#    A private temp index (kept OUTSIDE the staged work-tree so its lock file
#    isn't picked up) leaves the real index and HEAD untouched.
export GIT_INDEX_FILE="$(mktemp -u)"
git --work-tree="$STAGE" add -A
TREE="$(git --work-tree="$STAGE" write-tree)"
unset GIT_INDEX_FILE
COMMIT="$(git commit-tree "$TREE" -m "dist build from ${SRC_BRANCH}@${SRC_SHA}")"
git branch -f "$DIST_BRANCH" "$COMMIT"

echo "Built orphan branch '$DIST_BRANCH' -> $COMMIT (source ${SRC_BRANCH}@${SRC_SHA})"

# 5. Force-push (branch is always exactly one commit).
if [[ "${NO_PUSH:-0}" == "1" ]]; then
  echo "NO_PUSH set — skipping push. Inspect with: git ls-tree -r $DIST_BRANCH"
else
  git push --force "$REMOTE" "$DIST_BRANCH"
  echo "Pushed to $REMOTE/$DIST_BRANCH"
fi
