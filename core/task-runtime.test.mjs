import test from "node:test";
import assert from "node:assert/strict";
import { validateTaskForDelivery } from "./task-runtime.mjs";

const task = (overrides = {}) => ({
  taskId: "task-01", knowledgeItemId: "ki-01", hypothesisId: "hyp-01",
  phase: "NEW", contentVersion: "content-v1", approvalState: "APPROVED",
  payload: { prompt: "Choose the correct form." }, ...overrides
});
const pkg = (t = task()) => ({
  packageVersion: 1, task: t,
  trace: { taskId: t.taskId, contentVersion: t.contentVersion }
});
const state = (overrides = {}) => ({ state: "READY", ...overrides });
const validate = (overrides = {}) => validateTaskForDelivery({
  selectedTask: task(), contentPackage: pkg(), userState: state(),
  expectedContentVersion: "content-v1", expectedPhase: "NEW", ...overrides
});

test("delivers a valid task and returns a versioned contract", () => {
  const result = validate();
  assert.equal(result.status, "READY");
  assert.equal(result.contract.taskRuntimeVersion, "0.1.0");
  assert.equal(result.contract.hypothesisId, "hyp-01");
});

test("rejects unapproved content", () => {
  const t = task({ approvalState: "REVIEW_REQUIRED" });
  const result = validate({ selectedTask: t, contentPackage: pkg(t) });
  assert.equal(result.code, "CONTENT_NOT_APPROVED");
});

test("rejects task and package mismatch", () => {
  const t = task();
  const other = task({ taskId: "other-task" });
  const result = validate({ selectedTask: t, contentPackage: pkg(other) });
  assert.equal(result.code, "PACKAGE_TASK_MISMATCH");
});

test("requires User State before delivery and blocks unsafe/overloaded states", () => {
  assert.equal(validate({ userState: null }).code, "USER_STATE_MISSING");
  assert.equal(validate({ userState: state({ state: "OVERLOADED" }) }).code, "SAFETY_BLOCK");
  assert.equal(validate({ userState: state({ state: "UNSAFE" }) }).code, "SAFETY_BLOCK");
});

test("caution states reduce secondary load without dropping the main target", () => {
  const result = validate({ userState: state({ state: "CAUTION" }) });
  assert.equal(result.status, "READY");
  assert.deepEqual(result.contract.notices, ["REDUCE_SECONDARY_LOAD"]);
});

test("rejects premature mixing without an explicit passed gate", () => {
  const t = task({ phase: "MIX" });
  assert.equal(validate({ selectedTask: t, contentPackage: pkg(t), expectedPhase: "MIX" }).code, "PREMATURE_MIX_BLOCK");
  assert.equal(validate({ selectedTask: t, contentPackage: pkg(t), expectedPhase: "MIX", userState: state({ mixGatePassed: true }) }).status, "READY");
});

test("rejects incompatible version, phase, and hypothesis", () => {
  assert.equal(validate({ expectedContentVersion: "content-v2" }).code, "CONTENT_VERSION_MISMATCH");
  assert.equal(validate({ expectedPhase: "USE" }).code, "PHASE_MISMATCH");
  assert.equal(validate({ allowedHypothesisIds: ["hyp-other"] }).code, "HYPOTHESIS_NOT_ALLOWED");
});

test("rejects malformed task payload", () => {
  const t = task({ payload: { prompt: " " } });
  assert.equal(validate({ selectedTask: t, contentPackage: pkg(t) }).code, "TASK_PAYLOAD_INVALID");
});
