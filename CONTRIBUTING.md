# Working on the Operations Center

## Pull requests and releases

Every change goes through a pull request, and pull requests are squash-merged, so each becomes one commit whose
message is the pull request's title. The title starts with a type, which decides the next version:

| Type | For | Next version |
| --- | --- | --- |
| `feat:` | something new members or staff can see or use | 0.1.0 → 0.2.0 |
| `fix:` | a bug fix | 0.1.0 → 0.1.1 |
| `perf:` | faster or lighter, same behavior | 0.1.0 → 0.1.1 |
| `refactor:`, `docs:`, `chore:` | code, docs or tooling only | no release |

For example: `feat: Overview page for members`, `fix: Pills line up with section titles`. A check on each pull
request makes sure the title fits.

[Release Please](https://github.com/googleapis/release-please) keeps a release pull request open, listing what's
been merged since the last release. Merging it bumps the version in `package.json`, adds the list to
`CHANGELOG.md`, and tags and publishes the GitHub release; Vercel then deploys it. The release's notes are GitHub's
"What's Changed" list, grouped by each pull request's type label (added from its title) under the header in
`.github/release-header.md`. The version shows in the
Operations Center, so members know which release they're on.

## Issues

Work is tracked as issues, using the Bug and Feature forms. Labels say what kind of work it is and where:

- **Type:** `bug`, `feature`, `chore`
- **Area:** `area: overview`, `area: map`, `area: ctc`, `area: status`, `area: help`, `area: admin`, `area: agent`
- **Game:** `game: railroader`, `game: run8`

Each release has a milestone, such as "v0.2.0: Overview page", holding the issues it will ship. A pull request
that finishes an issue says `Closes #<number>` in its description, so merging it closes the issue.
