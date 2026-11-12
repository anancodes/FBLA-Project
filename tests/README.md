# Interface cleanup checks

The app remains a static HTML/CSS/JavaScript application. These optional test dependencies are separate from the website.

Run the dependency-free location checks from the repository root:

```sh
node --test tests/location.test.cjs
```

To run the browser checks, install Playwright and axe-core outside the repository if they are not already available:

```sh
npm --cache /tmp/volunteerhub-npm-cache install --prefix /tmp/volunteerhub-test-tools --no-save --package-lock=false playwright axe-core
```

Use an installed Chromium executable:

```sh
NODE_PATH=/tmp/volunteerhub-test-tools/node_modules BROWSER_PATH=/usr/bin/chromium node --test tests/location.test.cjs tests/ui-cleanup.browser.cjs
```

Or install Playwright's Chromium and omit `BROWSER_PATH`:

```sh
/tmp/volunteerhub-test-tools/node_modules/.bin/playwright install chromium
NODE_PATH=/tmp/volunteerhub-test-tools/node_modules node --test tests/location.test.cjs tests/ui-cleanup.browser.cjs
```

The fixture starts its own local server and isolated browser contexts, replaces the Firebase configuration for testing, and never connects to the production database. The live-signup test captures the profile handoff using a mock. `AXE_CORE_PATH` can point to an existing `axe.min.js`; when axe-core is unavailable, its scan is explicitly skipped.

The suite covers role-specific workflows, location behavior, complete CSV export, progressive disclosure, dialog/menu focus, all main viewport sizes, calendar names/targets, and accessibility scans in both themes. See [the change guide](../docs/UI_CLEANUP.md) for the full scope and deliberate access points.
