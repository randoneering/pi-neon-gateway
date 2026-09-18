# Workflows

- **ci.yml**: typecheck and unit tests on every push to main and every PR.
- **release-drafter.yml**: keeps a draft release on the Releases page. Labels pick the changelog section and the version bump: feat is minor, fix/docs/chore/... are patch, breaking is major. The autolabeler guesses labels from branch names and commit subjects. Relabel by hand when it guesses wrong.
- **publish.yml**: runs when you publish a release draft. Tests first, sets the npm version from the tag (v1.2.3 becomes 1.2.3), publishes with provenance. Skips until the NPM_TOKEN secret is set.

Release flow: merge PRs with titles like `feat: add thing` or `fix: stop crash`. The draft updates itself. Publish it when ready, and the tag and npm version come out the same.

The draft lists merged PRs only, not direct pushes to main. Land changes through PRs if you want them in the notes.
