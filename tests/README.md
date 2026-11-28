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
NODE_PATH=/tmp/volunteerhub-test-tools/node_modules BROWSER_PATH=/usr/bin/chromium node --test tests/location.test.cjs tests/ui-cleanup.browser.cjs tests/home-preview.browser.cjs tests/website-navigation.browser.cjs tests/public-landing.browser.cjs tests/loading.browser.cjs
```

Or install Playwright's Chromium and omit `BROWSER_PATH`:

```sh
/tmp/volunteerhub-test-tools/node_modules/.bin/playwright install chromium
NODE_PATH=/tmp/volunteerhub-test-tools/node_modules node --test tests/location.test.cjs tests/ui-cleanup.browser.cjs tests/home-preview.browser.cjs tests/website-navigation.browser.cjs tests/public-landing.browser.cjs tests/loading.browser.cjs
```

The fixture starts its own local server and isolated browser contexts, replaces the Firebase configuration for testing, and never connects to the production database. The live-signup test captures the profile handoff using a mock. `AXE_CORE_PATH` can point to an existing `axe.min.js`; when axe-core is unavailable, its scan is explicitly skipped.

The suite covers role-specific workflows, location behavior, complete CSV export, progressive disclosure, dialog/menu focus, all main viewport sizes, calendar names/targets, and accessibility scans in both themes. See [the change guide](../docs/UI_CLEANUP.md) for the full scope and deliberate access points.

The website checks also cover browser Back/Forward/refresh, new tabs, direct URL permissions and focused/invalid field borders. See [the selected design](../docs/OPEN_AGENDA.md) for the current scope and previews.

The public landing checks cover account links and history/new tabs, both account roles and permissions, keyboard sign-in/error recovery, connection/reset behavior, responsive themes, enlarged text and missing-image recovery. See [the public landing guide](../docs/PUBLIC_LANDING.md).

The loading checks simulate Firebase cache snapshots, slow startup, rate-limit errors, and unconfirmed or failed sign-up, attendance, and event writes.

## Firestore rules

Install the Firebase CLI and rules test dependencies outside the website. Java is required for the Firestore emulator. From the repository root:

```sh
npm --cache /tmp/volunteerhub-npm-cache install --prefix /tmp/volunteerhub-rules-tools --no-save \
  firebase-tools@14 firebase@11 @firebase/rules-unit-testing@4
NODE_PATH=/tmp/volunteerhub-rules-tools/node_modules \
  /tmp/volunteerhub-rules-tools/node_modules/.bin/firebase emulators:exec --project demo-volunteerhub \
  --only firestore 'node --test tests/firestore.rules.test.cjs'
```

The rules suite checks supported application operations and expected denials with fictional accounts and records.

## Hour alerts and reporting

The browser fixtures use fictional accounts. The Functions integration tests run actual Firestore transactions against the local emulator with a simulated Gmail provider and verified-account directory. All commands run from the repository root.

```sh
npm --prefix functions ci
npm --prefix functions run build
node --test tests/hour-alerts.test.cjs
NODE_PATH=/tmp/volunteerhub-test-tools/node_modules BROWSER_PATH=/usr/bin/chromium \
  node --test tests/hour-alerts.browser.cjs
NODE_PATH=/tmp/volunteerhub-rules-tools/node_modules \
  /tmp/volunteerhub-rules-tools/node_modules/.bin/firebase emulators:exec --project demo-volunteerhub \
  --only firestore 'node --test --test-concurrency=1 tests/firestore.rules.test.cjs tests/hour-alerts.emulator.cjs'
```

The worker checks both recipient identities, repeated runs, recovery and draft retries. The HTTP test exercises admin access, Google consent state, callback replay protection, status and disconnect. The browser test covers previews, validation, persistence, status recovery, monthly totals and report exports. [Real mailbox activation and staging verification](../docs/GMAIL-ALERTS.md)

## Persistent account and role checks

With the Firebase CLI, Firebase browser SDK and Playwright installed in the test tools path, run the account suite against both local emulators.

```sh
NODE_PATH=/tmp/volunteerhub-rules-tools/node_modules:/tmp/volunteerhub-test-tools/node_modules \
  /tmp/volunteerhub-rules-tools/node_modules/.bin/firebase emulators:exec --project demo-volunteerhub \
  --only auth,firestore 'node --test tests/accounts.emulator.cjs'
```

The browser registers both roles, reads the stored profile, signs out and returns from a fresh browser context. A local verification email opens the shared workspace. A separate test completes a profile after interrupted registration.
