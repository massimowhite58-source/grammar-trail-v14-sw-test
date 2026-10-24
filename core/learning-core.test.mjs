import test from "node:test";
import assert from "node:assert/strict";
import {
  PHASES, SAFETY, createSession, decideNextAction, submitAnswer, validateEventStream
} from "./learning-core.mjs";

const session = () => createSession({
  sessionId: "session-test",
  knowledgeItemId: "ki-present-simple",
  contentVersion: "content-v1",
  algorithmVersion: "core-test"
});

const task = (phase, taskId = "task-" + phase) => ({
  taskId,
  knowledgeItemId: "ki-present-simple",
  hypothesisId: "hypothesis-present-simple-form",
  phase,
  approvalState: "APPROVED",
  contentVersion: "content-v1",
  evaluator: "fixture-boolean"
});

test("initial decision is NEW and requires approved version-matched content", () => {
  const s = session();
  const result = decideNextAction({
    session: s,
    events: [],
    taskBank: [task("NEW", "new-1"), { ...task("NEW", "draft"), approvalState: "DRAFT" }]
  });
  assert.equal(result.action, "NEW");
  assert.equal(result.task.taskId, "new-1");
});

test("full deterministic cycle advances NEW → UNDERSTAND → RECALL → USE → COMPLETE", () => {
  const s = session();
  let events = [];
  const states = [];
  for (const phase of PHASES) {
    const t = task(phase);
    const result = submitAnswer({ events, session: s, task: t, response: { value: "fixture" }, correct: true, durationMs: 90000 });
    events = result.events;
    states.push(result.state.phase);
  }
  assert.deepEqual(states, ["UNDERSTAND", "RECALL", "USE", "COMPLETE"]);
  assert.equal(events.filter(e => e.type === "ANSWER_SUBMITTED").length, 4);
  assert.equal(events.filter(e => e.type === "PHASE_COMPLETED").length, 4);
  assert.equal(validateEventStream(events).valid, true);
});

test("an error appends evidence and recovery event without deleting prior events", () => {
  const s = session();
  const first = submitAnswer({ events: [], session: s, task: task("NEW"), response: "wrong", correct: false });
  const priorIds = first.events.map(e => e.eventId);
  const second = submitAnswer({ events: first.events, session: s, task: task("NEW", "task-new-retry"), response: "right", correct: true });
  assert.deepEqual(first.events.map(e => e.eventId), priorIds);
  assert.equal(second.events.length, first.events.length + 2);
  assert.equal(second.events[0].response, "wrong");
  assert.equal(second.state.phase, "UNDERSTAND");
  assert.equal(second.events.filter(e => e.type === "RECOVERY_SUPPORT_USED").length, 1);
});

test("slow correct response is not marked wrong", () => {
  const result = submitAnswer({ events: [], session: session(), task: task("NEW"), response: "right", correct: true, durationMs: 180000 });
  assert.equal(result.events.find(e => e.type === "ANSWER_SUBMITTED").correct, true);
  assert.equal(result.events.find(e => e.type === "ANSWER_SUBMITTED").durationMs, 180000);
});

test("unsafe context blocks answer recording", () => {
  const result = submitAnswer({ events: [], session: session(), task: task("NEW"), response: "answer", correct: true, safety: SAFETY.UNSAFE });
  assert.equal(result.events.length, 0);
  assert.equal(result.decision.action, "CLOSE_SESSION");
});

test("unapproved content is rejected", () => {
  assert.throws(() => submitAnswer({
    events: [], session: session(), task: { ...task("NEW"), approvalState: "DRAFT" }, response: "x", correct: true
  }), /unapproved content/);
});

test("phase mismatch is rejected", () => {
  assert.throws(() => submitAnswer({
    events: [], session: session(), task: task("USE"), response: "x", correct: true
  }), /task phase does not match/);
});


test("caution safety state defers task execution without recording an answer", () => {
  const result = submitAnswer({ events: [], session: session(), task: task("NEW"), response: "answer", correct: true, safety: SAFETY.CAUTION });
  assert.equal(result.events.length, 0);
  assert.equal(result.decision.action, "REDUCE_LOAD");
});

test("recorded event payload is deeply immutable", () => {
  const response = { nested: { value: "original" } };
  const result = submitAnswer({ events: [], session: session(), task: task("NEW"), response, correct: true });
  const event = result.events.find(e => e.type === "ANSWER_SUBMITTED");
  assert.equal(Object.isFrozen(event), true);
  assert.equal(Object.isFrozen(event.response), true);
  assert.equal(Object.isFrozen(event.response.nested), true);
  assert.equal(event.response.nested.value, "original");
});
