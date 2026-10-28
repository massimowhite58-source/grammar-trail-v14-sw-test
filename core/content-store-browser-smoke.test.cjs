const { chromium } = require("playwright");
const { setTimeout: delay } = require("node:timers/promises");

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));

  try {
    await page.goto("http://127.0.0.1:8000/core/content-store-browser-test.html", { waitUntil: "networkidle" });
    await page.getByRole("button", { name: "Clear test database only" }).click();
    page.once("dialog", dialog => dialog.accept());
    await page.getByRole("button", { name: "Run IndexedDB checks" }).click();
    await page.locator("#status").getByText(/NEXT: Reload this page/).waitFor({ timeout: 15000 });
    const firstRun = await page.locator("#status").innerText();
    if (!firstRun.includes("PASS: IndexedDB API is available.") ||
        !firstRun.includes("PASS: valid package installed") ||
        !firstRun.includes("PASS: active package read-back matches.") ||
        !firstRun.includes("PASS: invalid update rejected; previous active package retained.")) {
      throw new Error("Initial Content Store checks did not all pass:\\n" + firstRun);
    }

    await page.reload({ waitUntil: "networkidle" });
    await page.getByRole("button", { name: "Verify after reload" }).click();
    await page.locator("#status").getByText(/PASS: exact package ref and content body are preserved/).waitFor({ timeout: 15000 });
    const afterReload = await page.locator("#status").innerText();
    if (!afterReload.includes("PASS: active package survived page reload.") ||
        !afterReload.includes("PASS: exact package ref and content body are preserved.")) {
      throw new Error("Reload persistence checks did not all pass:\\n" + afterReload);
    }
    if (errors.length) throw new Error("Browser page errors: " + errors.join(" | "));

    console.log("PASS: Content Store package installation and read-back.");
    console.log("PASS: invalid package update rejected without replacing active package.");
    console.log("PASS: active package and exact content survived page reload.");
    console.log("PASS: no uncaught browser page errors.");
    console.log("NOTE: this automated Chromium run does not replace manual Safari/iPhone/Android verification.");
  } finally {
    await page.close();
    await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
