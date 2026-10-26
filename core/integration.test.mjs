import test from "node:test";
import assert from "node:assert/strict";
import { resolveContent } from "./content-runtime.mjs";
import { validateTaskForDelivery } from "./task-runtime.mjs";
import { createSession, submitAnswer, validateEventStream } from "./learning-core.mjs";
import { planRecovery } from "./recovery-runtime.mjs";

const item = (overrides = {}) => ({
  taskId: "task-new-01",
  knowledgeItemId: "ki-present-simple",
  hypothesisId: "hyp-third-person-s",
  phase: "NEW",
  contentVersion: "content-v1",
  approvalState: "APPROVED",
  payload: { prompt: "Choose the correct sentence.", choices: ["She work.", "She works."] },
  ...overrides
});
const request = (items, overrides = {}) => ({
  knowledgeItemId: "ki-present-simple",
  contentVersion: "content-v1",
  phase: "NEW",
  items,
  ...overrides
});
const userState = (state = "READY") => ({ state });
const session = () => createSession({
  sessionId: "integration-session",
  knowledgeItemId: "ki-present-simple",
  contentVersion: "content-v1",
  algorithmVersion: "integration-test"
});
function resolveAndGate(contentItems, overrides = {}) {
  const content = resolveContent(request(contentItems));
  assert.equal(content.status, "READY");
  const gate = validateTaskForDelivery({
    selectedTask: content.package.task,
    contentPackage: content.package,
    userState: userState(),
    expectedContentVersion: "content-v1",
    expectedPhase: "NEW",
    ...overrides
  });
  return { content, gate };
}

test("Content Runtime → Task Runtime → Learning Core → Recovery Runtime preserves one target and event history", () => {
  const { content, gate } = resolveAndGate([item()]);
  assert.equal(gate.status, "READY");
  const s = session();
  const first = submitAnswer({
    events: [], session: s, task: gate.task,
    response: { selectedIndex: 0, selectedText: "She work." },
    correct: false, safety: "SAFE"
  });
  assert.equal(first.state.phase, "NEW");
  assert.equal(first.events.length, 2);
  const answer = first.events.find(event => event.type === "ANSWER_SUBMITTED");
  const recovery = planRecovery({ answerEvent: answer, userState: userState() });
  assert.equal(recovery.status, "READY");
  assert.equal(recovery.triggerEventId, answer.eventId);
  assert.equal(recovery.strategy.preserveTarget, true);
  assert.equal(recovery.invariants.includes("DO_NOT_EDIT_OR_DELETE_HISTORY"), true);
  assert.equal(validateEventStream(first.events).valid, true);
  assert.equal(first.events[0].hypothesisId, content.package.task.hypothesisId);
});

test("correct answer passes the same delivery gate and advances the learning phase", () => {
  const { gate } = resolveAndGate([item()]);
  const result = submitAnswer({
    events: [], session: session(), task: gate.task,
    response: { selectedIndex: 1, selectedText: "She works." },
    correct: true, durationMs: 12000, safety: "SAFE"
  });
  assert.equal(result.state.phase, "UNDERSTAND");
  assert.equal(result.events.filter(event => event.type === "ANSWER_SUBMITTED").length, 1);
  assert.equal(result.events.filter(event => event.type === "PHASE_COMPLETED").length, 1);
  assert.equal(validateEventStream(result.events).valid, true);
});

test("missing User State or unsafe state is blocked before an answer can be recorded", () => {
  const { content } = resolveAndGate([item()]);
  const missing = validateTaskForDelivery({
    selectedTask: content.package.task, contentPackage: content.package,
    userState: null, expectedContentVersion: "content-v1", expectedPhase: "NEW"
  });
  assert.equal(missing.code, "USER_STATE_MISSING");
  const unsafe = validateTaskForDelivery({
    selectedTask: content.package.task, contentPackage: content.package,
    userState: userState("UNSAFE"), expectedContentVersion: "content-v1", expectedPhase: "NEW"
  });
  assert.equal(unsafe.code, "SAFETY_BLOCK");
  assert.equal(unsafe.status, "REJECTED");
});

test("approval and version mismatches are blocked before the Learning Core", () => {
  const unapproved = resolveContent(request([item({ approvalState: "REVIEW_REQUIRED" })]));
  assert.equal(unapproved.status, "UNAVAILABLE");
  const { content } = resolveAndGate([item()]);
  const mismatch = validateTaskForDelivery({
    selectedTask: content.package.task, contentPackage: content.package,
    userState: userState(), expectedContentVersion: "content-v2", expectedPhase: "NEW"
  });
  assert.equal(mismatch.code, "CONTENT_VERSION_MISMATCH");
});
