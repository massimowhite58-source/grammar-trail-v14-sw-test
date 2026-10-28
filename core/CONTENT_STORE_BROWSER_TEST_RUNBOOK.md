# Content Store browser check — runbook

This is a diagnostic for the isolated Content Store only. It must not be used as a production migration tool.

## Safety boundary

- The test uses the dedicated IndexedDB database `grammar-trail-content-browser-test`.
- It does not intentionally access dashboard progress, Learning Events, User Facts, or production databases.
- Do not merge the feature branch into `main` as part of this test.
- Browser testing is not complete until the checks below have actually been run on the target browser/device.

## Run on a Mac

1. Download the ZIP for branch `feature/content-library-v1` from the repository's GitHub page and extract it, or clone the repository and switch to that branch.
2. Open Terminal and change directory to the extracted repository folder.
3. Start a local HTTP server from the repository root:

   ```bash
   python3 -m http.server 8000
   ```

4. In the browser, open:

   `http://localhost:8000/core/content-store-browser-test.html`

   Keep the Terminal window running while testing. Do not open the HTML file by double-clicking it; ES module imports require an HTTP origin.

## Test sequence

1. Click **Run IndexedDB checks**.
2. Confirm the page reports that IndexedDB is available, the valid fixture package was activated, its content can be read back, and an invalid update was rejected while the previous active package remained active.
3. Reload the page.
4. Click **Verify after reload**. It should confirm the active package reference and content survived the reload.
5. Record the browser/device, date, and exact PASS/FAIL output. A screenshot or copied output is useful for the test log.
6. To clean up, click **Clear test database only**. This deletes only the dedicated browser-test database.

## Expected outcome and limits

- A successful run is evidence for this browser and this test fixture only.
- Repeat on Safari on iPhone and on Android Chrome before making cross-device claims.
- This test does not yet prove offline behavior, browser eviction resistance, quota recovery, full app integration, or preservation of actual learner history during an application upgrade.
- If a check fails, keep the output and do not merge. Fix the issue on the feature branch and rerun the test.
