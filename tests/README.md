# Review checks

Run the progress/data checks from the repository root with Node.js:

```sh
node --test tests/progress.test.cjs
```

Browser checks use Playwright and Chromium. They start their own local server and use isolated browser contexts with sample data. The app itself still needs no dependencies or build step.

If Playwright is not already available, install test tools outside the repository:

```sh
npm --cache /tmp/volunteerhub-npm-cache install --prefix /tmp/volunteerhub-browser-tools --no-save --package-lock=false playwright axe-core
```

With a system Chromium installation:

```sh
NODE_PATH=/tmp/volunteerhub-browser-tools/node_modules BROWSER_PATH=/usr/bin/chromium node --test tests/review.browser.cjs
```

Alternatively, install Playwright's Chromium using its CLI and omit `BROWSER_PATH`:

```sh
/tmp/volunteerhub-browser-tools/node_modules/.bin/playwright install chromium
NODE_PATH=/tmp/volunteerhub-browser-tools/node_modules node --test tests/review.browser.cjs
```

The browser checks cover both tours, keyboard navigation, focus and replay behavior, preserved unread announcements, dialog focus containment/restoration, continuous progress colors with at least 3:1 contrast against their tracks, chart legibility, named calendar controls, and all role screens at 320, 390, 768, 1024, and 1440px. They also run axe across the role screens and sample dialogs in both themes. If axe-core is not installed, that optional scan is skipped; `AXE_CORE_PATH` can point to an existing `axe.min.js` instead. These checks do not cover every remaining issue in the [frontend review](../docs/FRONTEND_REVIEW.md).
