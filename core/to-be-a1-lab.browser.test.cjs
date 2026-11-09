const { chromium } = require("playwright");
const assert = require("node:assert/strict");

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  try {
    const response = await page.goto("http://127.0.0.1:4173/core/to-be-a1-lab.html", {
      waitUntil: "load",
      timeout: 30000,
    });
    assert.ok(response && response.ok(), "TO BE A1 Lab page must load");
    await page.waitForSelector("#exerciseId");

    const exerciseIds = await page.locator("#exerciseSelect option").evaluateAll((items) =>
      items.map((item) => item.value)
    );
    assert.equal(exerciseIds.length, 32, "all 32 source exercises must be available");
    assert.deepEqual(exerciseIds, [
      "A1","A2","A3","A4","A5","A6","A7","A8",
      "B1","B2","B3","B4","B5","B6","B7","B8",
      "C1","C2","C3","C4","C5","C6","C7","C8",
      "D1","D2","D3","D4","D5","D6","D7","D8",
    ]);

    // Every exercise can be opened and exposes its source heading/prompt.
    for (const id of exerciseIds) {
      await page.locator("#exerciseSelect").selectOption(id);
      assert.equal((await page.locator("#exerciseId").textContent()).trim(), id);
      assert.ok((await page.locator("#exercisePrompt").textContent()).trim().length > 0, `${id} prompt must render`);
      assert.ok((await page.locator("#sourceDoc").textContent()).includes(`SET_${id[0]}_EXERCISES_AND_ANSWER_FEEDBACK.md`));
    }

    // Raw text is preserved exactly, including leading/trailing spaces and punctuation.
    await page.locator("#exerciseSelect").selectOption("A1");
    await page.locator("#control-A1.r01").fill("  am!?  ");
    let payload = JSON.parse(await page.locator("#rawPayload").textContent());
    assert.equal(payload.exerciseId, "A1");
    assert.equal(payload.responses[0].rawValue, "  am!?  ");
    assert.equal(payload.responses[0].status, "VALUE");

    // An explicitly cleared field differs from a field that was never touched.
    await page.locator("#control-A1.r01").fill("");
    payload = JSON.parse(await page.locator("#rawPayload").textContent());
    assert.equal(payload.responses[0].status, "EMPTY");
    assert.equal(payload.responses[1].status, "NOT_TOUCHED");

    // Matching retains the stable selected option ID separately from display text.
    await page.locator("#exerciseSelect").selectOption("A2");
    await page.locator("#control-A2.r01").selectOption("A2.right.c");
    payload = JSON.parse(await page.locator("#rawPayload").textContent());
    assert.equal(payload.responses[0].selectedOptionId, "A2.right.c");
    assert.equal(payload.responses[0].displayText, "c) They are at an English course.");
    assert.equal(payload.responses[0].matchingLeftItemId, "A2.left.01");

    // Choice responses retain option identity, not just index or label.
    await page.locator("#exerciseSelect").selectOption("A7");
    await page.locator("#control-A7.r01-A7.opt.B").check();
    payload = JSON.parse(await page.locator("#rawPayload").textContent());
    assert.equal(payload.responses[0].selectedOptionId, "A7.opt.B");

    // True/False is captured as the source label, not represented as a fabricated option ID.
    await page.locator("#exerciseSelect").selectOption("A5");
    await page.locator("#control-A5.r01").selectOption("True");
    payload = JSON.parse(await page.locator("#rawPayload").textContent());
    assert.equal(payload.responses[0].rawValue, "True");
    assert.equal(payload.responses[0].optionIdentity, "SOURCE_LABEL_ONLY");

    // Multi-part question/answer capture keeps each manifest ID independent.
    await page.locator("#exerciseSelect").selectOption("D6");
    assert.equal(await page.locator("#responseFields .field").count(), 8);
    await page.locator("#control-D6.r01.question").fill("What is his name?");
    payload = JSON.parse(await page.locator("#rawPayload").textContent());
    assert.equal(payload.responses[0].responseUnitId, "D6.r01.question");
    assert.equal(payload.responses[0].rawValue, "What is his name?");
    assert.equal(payload.responses[1].status, "NOT_TOUCHED");

    // Open text keeps line breaks and punctuation verbatim.
    await page.locator("#exerciseSelect").selectOption("D8");
    await page.locator("#control-D8.part1.r01").fill("Hello!\nI am Alex.  ");
    payload = JSON.parse(await page.locator("#rawPayload").textContent());
    assert.equal(payload.responses[0].rawValue, "Hello!\nI am Alex.  ");
    assert.equal(payload.responses[1].status, "NOT_TOUCHED");

    // State is retained only during this page session and reset is scoped to one exercise.
    await page.locator("#exerciseSelect").selectOption("A1");
    payload = JSON.parse(await page.locator("#rawPayload").textContent());
    assert.equal(payload.responses[0].status, "EMPTY");
    await page.locator("#clearButton").click();
    payload = JSON.parse(await page.locator("#rawPayload").textContent());
    assert.equal(payload.responses[0].status, "NOT_TOUCHED");

    assert.equal(await page.evaluate(() => document.querySelectorAll("script").length), 1);
    assert.equal(await page.evaluate(() => performance.getEntriesByType("resource").filter((entry) => /https?:/.test(entry.name) && !entry.name.includes("127.0.0.1")).length), 0,
      "page must not load external scripts or resources");
    assert.deepEqual(pageErrors, [], "browser must report no uncaught page errors");

    console.log("TO BE A1 Lab browser checks: 32 exercises rendered; raw text, empty/touched states, stable choice/matching IDs, multi-part capture, in-session navigation and scoped reset passed.");
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
