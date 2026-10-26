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
    if (!/^7 passed · 0 failed$/.test(status)) throw new Error(`Unexpected browser smoke-test result: ${status}`);
    if (pageErrors.length) throw new Error(`Browser page errors: ${pageErrors.join("; ")}`);
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
