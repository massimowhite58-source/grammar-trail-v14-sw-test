# Grammar Trail — v14 Service Worker test

This is an isolated test deployment. The production repository and its `main` branch have not been changed.

## Contents
- `index.html` — dashboard from the current v14 app.
- `service-worker.js` — isolated cache test candidate (`grammar-trail-v14-sw-test-` namespace).
- `manifest.webmanifest` — PWA manifest.
- `icon-192.png`, `icon-512.png` — app icons.
- `.github/workflows/deploy-pages.yml` — GitHub Pages deployment workflow.

## Enable the test site
1. Open **Settings → Pages** in this repository.
2. Under **Build and deployment**, choose **GitHub Actions** as the source.
3. Return to **Actions → Deploy Grammar Trail test to GitHub Pages** and re-run the latest workflow, or push a new commit.
4. Wait for a green check before opening the published URL shown in the workflow summary.

## iPhone test checklist
1. Open the published HTTPS URL in Safari.
2. Confirm the dashboard appears and scrolling/search/unit panels work.
3. Mark a unit as learned, reload, and confirm the progress mark persists.
4. Open the site online once; then enable Airplane Mode and reopen it.
5. Turn Airplane Mode off and reload.
6. Report any visual, interaction, persistence, or offline issues before we consider production rollout.

This repository is only for testing. Do not merge it into the production project until device tests pass.
