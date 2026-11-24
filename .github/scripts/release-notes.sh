#!/usr/bin/env bash
# Replaces a release's notes with GitHub's own "What's Changed" notes (grouped by .github/release.yml), under the
# header in .github/release-header.md, and sets its title. The previous release is the newest one with the same tag
# prefix ("" for v1.2.3, "agent-" for agent-v1.2.3), so tools released from one repository each get their own notes.
# Usage: release-notes.sh <tag> <title>     Needs GH_TOKEN and GITHUB_REPOSITORY.
set -euo pipefail
tag="$1"
title="$2"
prefix="${tag%v*}v"

previous=$(gh api "repos/$GITHUB_REPOSITORY/releases?per_page=100" \
  --jq "[.[] | select(.tag_name != \"$tag\" and (.tag_name | startswith(\"$prefix\")))][0].tag_name // empty")
args=(-f tag_name="$tag")
if [ -n "$previous" ]; then args+=(-f previous_tag_name="$previous"); fi
notes=$(gh api "repos/$GITHUB_REPOSITORY/releases/generate-notes" "${args[@]}" --jq .body)

gh release edit "$tag" --title "$title" --notes "$(cat .github/release-header.md)"$'\n\n'"$notes"
