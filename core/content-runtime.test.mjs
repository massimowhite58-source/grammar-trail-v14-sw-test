import test from "node:test";
import assert from "node:assert/strict";
import { resolveContent, summarizeContentRuntimeEvents } from "./content-runtime.mjs";

const task = (overrides = {}) => ({
  taskId: "task-new-01",
  knowledgeItemId: "ki-present-simple",
  hypothesisId: "hypothesis-third-person-s",
  phase: "NEW",
  contentVersion: "content-v1",
  approvalState: "APPROVED",
  payload: { prompt: "Choose the correct sentence.", choices: ["She work", "She works"] },
  ...overrides
});
const request = (items, overrides = {}) => ({
  knowledgeItemId: "ki-present-simple",
  contentVersion: "content-v1",
  phase: "NEW",
  items,
  ...overrides
});

test("returns approved content matching exact phase and version", () => {
  const result = resolveContent(request([task()]));
  assert.equal(result.status, "READY");
  assert.equal(result.package.trace.source, "CATALOG");
  assert.equal(result.package.task.taskId, "task-new-01");
});

test("rejects unapproved content even when it otherwise matches", () => {
  const result = resolveContent(request([task({ approvalState: "REVIEW_REQUIRED" })]));
  assert.equal(result.status, "UNAVAILABLE");
  assert.equal(result.reason, "NO_LEARNER_APPROVED_CONTENT");
  assert.equal(result.package, null);
});

test("rejects content version mismatch", () => {
  const result = resolveContent(request([task({ contentVersion: "content-v0" })]));
  assert.equal(result.status, "UNAVAILABLE");
  assert.equal(result.reason, "NO_COMPATIBLE_CONTENT");
});

test("rejects content from a different learning phase", () => {
  const result = resolveContent(request([task({ phase: "USE" })]));
  assert.equal(result.status, "UNAVAILABLE");
});

test("uses only an approved, exact-version cache package for offline fallback", () => {
  const cachedTask = task();
  const cachePackage = {
    packageVersion: 1,
    runtimeVersion: "0.1.0",
    task: cachedTask,
    trace: { taskId: cachedTask.taskId, contentVersion: cachedTask.contentVersion }
  };
  const result = resolveContent(request([]), { cache: [cachePackage] });
  assert.equal(result.status, "READY");
  assert.equal(result.reason, "OFFLINE_APPROVED_CACHE");
  assert.equal(result.package.trace.source, "LOCAL_CACHE");
});

test("does not use a cache entry with incompatible version", () => {
  const bad = { packageVersion: 1, task: task({ contentVersion: "content-v0" }), trace: { taskId: "task-new-01", contentVersion: "content-v0" } };
  const result = resolveContent(request([]), { cache: [bad] });
  assert.equal(result.status, "UNAVAILABLE");
});

test("emits operational events without breaking flow if observer fails", () => {
  const seen = [];
  const result = resolveContent(request([task()]), { observer: e => { seen.push(e.type); } });
  assert.equal(result.status, "READY");
  assert.deepEqual(seen, ["CONTENT_REQUESTED", "CONTENT_RESOLVED"]);
  assert.deepEqual(summarizeContentRuntimeEvents(seen.map(type => ({ type, source: "CATALOG" }))), {
    requestCount: 1, resolvedFromCatalog: 1, localFallbackCount: 0, unavailableCount: 0, lastOutcome: "CONTENT_RESOLVED"
  });
  assert.doesNotThrow(() => resolveContent(request([task()]), { observer: () => { throw new Error("monitor down"); } }));
});

test("requires explicit request fields and item array", () => {
  assert.throws(() => resolveContent({ phase: "NEW", items: [] }), /knowledgeItemId is required/);
});
