# GitHub in 20 minutes — collaborator + coding agent

This is the minimum workflow for contributing to any Tembro repository without
creating a second, drifting version of the product.

## The seven words that matter

- **Repository:** the shared project and its history.
- **`main`:** the current reviewed source of truth. Do not work directly here.
- **Issue:** the problem, decision, or outcome to achieve.
- **Branch:** a safe lane for one piece of work.
- **Commit:** a named checkpoint on that branch.
- **Pull request (PR):** the proposal to add the branch to `main`.
- **CI:** automatic checks that must be green before merge.

The normal path is always:

`issue → branch → changes → tests → commits → push → PR → CI/review → merge`

A local folder, a ZIP, a chat summary, and “it works on my computer” are never the
shared source of truth.

## Before every task

Give the coding agent this exact instruction:

> Read AGENTS.md completely, then every relevant nested AGENTS.md. Read the linked
> launch-control issue and product state when the task touches a site, release,
> download, payment, licence, or Cloudflare. Fetch origin, show the current branch
> and working-tree status, and search open issues and PRs for overlapping work.
> Do not change anything until you can name one issue and one intended outcome.

If no issue exists, open a short one first:

- what is wrong or missing;
- what “done” means;
- what is deliberately out of scope.

## The one-task loop

Tell the agent:

> Create a branch from current `origin/main` named
> `<your-handle>/<issue-number>-<short-slug>`. Implement only that issue. Preserve
> unrelated local changes. Run the repository's documented tests. Make small,
> descriptive commits, push the branch, and open a PR that links the issue. Report
> the PR URL, tests run, remaining risk, and one next action. Do not deploy, publish,
> change payments, or merge unless the repository policy explicitly permits it.

Example branch: `collab/70-fix-chordarium-route`.

A PR should answer four questions:

1. What outcome changes?
2. How was it tested?
3. What can still go wrong?
4. Does it touch a human gate?

## Responding to CI and review

Give the agent:

> Read every failed CI step and every unresolved review thread. Diagnose the first
> real cause; do not retry blindly. Fix only the PR's scope, rerun the same checks
> locally when possible, push another commit, and update the PR summary. Never hide
> a failure by weakening or deleting a test.

Green CI means “the automated checks passed,” not “the product is released.”

## Merge rule

Normal code may be merged only when:

- the PR has one clear purpose;
- it is based on current `main`;
- required CI is green;
- review conversations are resolved;
- no human gate below applies.

Prefer **Squash and merge**, then delete the branch. Start the next task from a
fresh, updated `main`; never keep developing on the merged branch.

## Always stop for Stefano

The collaborator and their agent must not independently:

- change price, product/store/variant IDs, licence terms, activation limits, or
  customer-facing product promises;
- upload or replace a Lemon Squeezy customer file;
- create a release/tag or sign/notarize an artifact;
- deploy Cloudflare production, modify DNS/routes/secrets, or apply a D1 migration;
- publish GitHub Pages when generated `dist/` content could expose a full engine;
- change legal, privacy, tax, refund, copyright, Scaler-corpus, or JUCE decisions;
- unarchive or launch a product;
- bypass protection, force-push `main`, or merge with red/pending CI.

For those tasks, the agent should leave the PR ready, post evidence in the central
issue, name Stefano as owner, and stop.

## Never do these

- Never share a password, API key, signing certificate, licence key, or `.env` in
  a prompt, commit, issue, or screenshot.
- Never run `git reset --hard`, force-push a shared branch, delete an unknown
  branch, or rewrite history to “make it clean.”
- Never mix Atlas, Chordarium, Rudiment, Tembro, storefront, and infrastructure
  changes in one PR just because they were discussed in one chat.
- Never accept an agent's claim that something is live: ask for the URL, run ID,
  deployment/version ID, tag, or artifact hash.

## If anything feels confusing

Stop. Nothing is lost by stopping before a push or merge. Ask the agent to return
only:

- repository and branch;
- `git status`;
- linked issue and PR;
- latest commit SHA;
- CI result;
- the exact blocker;
- one safest next action.

Do not ask it to “clean everything up.”

## Access setup for the repository owner

For the current personal `ste-hue/*` repositories, invite the exact GitHub username
as a collaborator. Personal private repositories give collaborators write access,
so process and branch protection matter.

For each active repository:

1. **Settings → Collaborators → Add people**.
2. Invite the verified username.
3. Protect `main`: require a pull request, required CI, resolved conversations,
   block force pushes/deletion, and require another person's approval for protected
   release/infrastructure changes where the GitHub plan permits it.
4. Keep production secrets in protected environments, never in repository variables
   or local chat context.

Longer term, move Tembro repositories into a GitHub organization. Use a developer
team for ordinary branches/PRs and a smaller release-owner group for environments,
secrets, payments, releases, and repository settings. That gives the workflow real
permission boundaries instead of relying only on memory and good intentions.

## Two-minute daily habit

The collaborator opens GitHub, not the local folder:

1. Read the assigned issue.
2. Open their PR and read CI/review.
3. Ask the agent for exactly one next action.
4. Stop after the PR is updated.

That is enough GitHub knowledge. The agent handles commands; the human protects
scope, evidence, and decisions.
