const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  try {
    const response = await page.goto("http://127.0.0.1:4173/core/indexeddb-browser-smoke-test.html", {
      waitUntil: "load",
      timeout: 30000,
    });
    if (!response || !response.ok()) throw new Error(`Smoke page failed to load: ${response?.status()}`);
    await page.waitForFunction(() => {
      const status = document.querySelector("#status")?.textContent || "";
      return /\d+ passed · \d+ failed/.test(status);
    }, { timeout: 30000 });

    const status = (await page.locator("#status").textContent()).trim();
    const details = (await page.locator("#details").textContent()).trim();
    console.log(status);
    if (details !== "No errors.") console.error(details);
    if (!/^11 passed · 0 failed$/.test(status)) throw new Error(`Unexpected browser smoke-test result: ${status}`);

    if (pageErrors.length) throw new Error(`Browser page errors: ${pageErrors.join("; ")}`);

    // Separate browser document loads use the same isolated database name to
    // prove persistence across a real page reload, not only adapter close/open.
    const restartPage = await browser.newPage();
    const restartDb = `grammar-trail-restart-test-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const restartUrl = `http://127.0.0.1:4173/core/indexeddb-page-restart-test.html?db=${restartDb}`;
    try {
      const writeResponse = await restartPage.goto(`${restartUrl}&mode=write`, { waitUntil: "load", timeout: 30000 });
      if (!writeResponse || !writeResponse.ok()) throw new Error("Restart write page failed to load");
      await restartPage.waitForFunction(() => document.querySelector("#status")?.textContent === "WRITE_OK", { timeout: 15000 });

      const readResponse = await restartPage.goto(`${restartUrl}&mode=read`, { waitUntil: "load", timeout: 30000 });
      if (!readResponse || !readResponse.ok()) throw new Error("Restart read page failed to load");
      await restartPage.waitForFunction(() => {
        const value = document.querySelector("#status")?.textContent || "";
        return value === "READ_OK" || value.startsWith("ERROR:");
      }, { timeout: 15000 });
      const restartStatus = (await restartPage.locator("#status").textContent()).trim();
      if (restartStatus !== "READ_OK") throw new Error(`Page-reload persistence failed: ${restartStatus}`);
      console.log("PASS — IndexedDB data survives a full page reload");
    } finally {
      await restartPage.evaluate((dbName) => new Promise((resolve) => {
        const request = indexedDB.deleteDatabase(dbName);
        request.onsuccess = request.onerror = request.onblocked = () => resolve();
      }), restartDb).catch(() => {});
      await restartPage.close();
    }
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
