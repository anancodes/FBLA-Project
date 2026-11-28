# Impeccable for VolunteerHub

Impeccable is installed for this repository at `.agents/skills/impeccable/`, using the official Codex manual-copy distribution. It assists design work; installing it does not change the website.

## Use in Codex

1. Pull the latest repository changes into your local checkout, or start a new Codex cloud task on the updated branch.
2. Open the FBLA-Project repository in Codex. Start a new task/session if its skill list predates this installation.
3. Type `$impeccable` in the Codex prompt, or find it through `/skills`.
4. Start with `$impeccable init` to capture product context.

Run these prompts one at a time:

```text
$impeccable critique the VolunteerHub student dashboard. Inspect desktop and mobile, and identify the five biggest problems with clutter and visual hierarchy.
```

```text
$impeccable distill the student dashboard. Simplify the layout and prioritize upcoming commitments and finding opportunities. Preserve all features, keyboard accessibility, and existing backend behavior. Keep our vanilla HTML/CSS/JavaScript stack.
```

```text
$impeccable quieter the student dashboard. Reduce competing decoration, borders, badges, and colors while preserving useful status information.
```

```text
$impeccable audit the updated dashboard on desktop and mobile.
```

Other useful commands: `layout` for spacing, `typeset` for text hierarchy, `adapt` for screen sizes, and `polish` for finishing details. Target one screen at a time before extending the design.

The web app lives in `volunteerhub-web/vh-web/`. Existing frontend-design and frontend-ui-engineering skills remain available; explicitly name Impeccable to select this workflow.

## Project context and configuration

- [PRODUCT.md](../PRODUCT.md) records confirmed audiences, release intent, workflows, constraints, and open product decisions.
- `.impeccable/config.json` stores the chosen build workflow. Read it as the source of truth for that setting.
- `.impeccable/live/config.json` targets the existing web entry point. The repository and entry file were checked for CSP; no source policy changes were needed. This prepares configuration only: a live session still requires the project's design system to be documented separately.
- [NEXT_UI_BRIEF.md](NEXT_UI_BRIEF.md) records the queued interface changes, awaiting the owner's instruction to start them.

Commit durable Impeccable artifacts when they exist: `PRODUCT.md`, `DESIGN.md`, `.impeccable/config.json`, `.impeccable/surfaces/`, `.impeccable/design.json`, `.impeccable/live/config.json`, and `.impeccable/critique/ignore.md`. Keep runtime output and `.impeccable/config.local.json` out of version control. A blanket ignore of `.impeccable/` would hide shared project context.

## Installation scope and runtime

This is the upstream manual-copy skill installation, including references, launchers, and bundled agent definitions. Automatic design hooks and Codex subagent registrations are not configured by this copy. The skill supports fallback workflows when these are unavailable.

On first use, the launcher may download its pinned engine from GitHub Releases and verify it against the included checksums. Network access to GitHub release downloads and a writable user cache are required for engine features. Restricted environments can still follow the skill's documented fallback for design work.

For optional automatic hooks, use the official installer from the repository root:
`npx impeccable install --providers=codex --scope=project`
Review the resulting changes and approve the project hook through Codex's `/hooks` UI where supported.

For optional live editing, set `IMPECCABLE_LIVE_COPY_AGENT=chat` in the environment that starts live mode to keep Apply in the current chat session; see upstream documentation before enabling this feature.

## Provenance

- Source: https://github.com/pbakaus/impeccable
- Pinned upstream revision: `f2baa414a87d9acf1e21ccf776bfaec0262ad6df`
- Skill version: 4.8.2
- Distribution: `.agents/skills/impeccable/`
- License and notices copied into the installed skill folder.
- Docs: https://impeccable.style/docs

To update deliberately, use the official installer/update workflow and review its changes. This vendored snapshot does not update automatically.
