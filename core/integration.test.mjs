import test from "node:test";
import assert from "node:assert/strict";
import { resolveContent } from "./content-runtime.mjs";
import { validateTaskForDelivery } from "./task-runtime.mjs";
import { createSession, decideNextAction, submitAnswer, validateEventStream, reconstructState } from "./learning-core.mjs";
import { InMemoryPersistenceAdapter } from "./persistence-adapter.mjs";
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

test("a later incorrect answer preserves earlier successful evidence", () => {
  const phases = ["NEW", "UNDERSTAND"];
  const tasks = phases.map(phase => item({
    taskId: `task-${phase.toLowerCase()}`,
    phase,
    payload: { prompt: `Demonstration prompt for ${phase}`, choices: ["A", "B"] }
  }));
  const s = session();
  const first = submitAnswer({
    events: [], session: s, task: tasks[0],
    response: { selectedIndex: 1, selectedText: "B" },
    correct: true, safety: "SAFE"
  });
  const originalHistory = JSON.stringify(first.events);
  assert.deepEqual(first.state.completedPhases, ["NEW"]);
  assert.equal(first.state.correctAttempts, 1);

  const second = submitAnswer({
    events: first.events, session: s, task: tasks[1],
    response: { selectedIndex: 0, selectedText: "A" },
    correct: false, safety: "SAFE"
  });

  assert.equal(JSON.stringify(second.events.slice(0, first.events.length)), originalHistory);
  assert.equal(second.events.length, first.events.length + 2);
  assert.deepEqual(second.state.completedPhases, ["NEW"]);
  assert.equal(second.state.phase, "UNDERSTAND");
  assert.equal(second.state.attempts, 2);
  assert.equal(second.state.correctAttempts, 1);
  assert.equal(second.state.incorrectAttempts, 1);
  assert.equal(second.state.lastSupportLevel, "INDEPENDENT_RETRY");
  assert.equal(validateEventStream(second.events).valid, true);
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

test("integrated pipeline completes NEW → UNDERSTAND → RECALL → USE without changing the target", () => {
  const phases = ["NEW", "UNDERSTAND", "RECALL", "USE"];
  const items = phases.map((phase, index) => item({
    taskId: `task-${phase.toLowerCase()}`,
    phase,
    payload: { prompt: `Demonstration prompt for ${phase}`, choices: ["A", "B"] }
  }));
  const s = session();
  const taskBank = items;
  let events = [];

  for (const phase of phases) {
    const decision = (awaitableDecideNextAction)(events, s, taskBank);
    assert.equal(decision.action, phase);
    assert.equal(decision.task.phase, phase);

    const resolved = resolveContent(request(items, { phase }));
    assert.equal(resolved.status, "READY");
    assert.equal(resolved.package.task.taskId, decision.task.taskId);

    const gate = validateTaskForDelivery({
      selectedTask: decision.task,
      contentPackage: resolved.package,
      userState: userState(),
      expectedContentVersion: "content-v1",
      expectedPhase: phase,
      allowedHypothesisIds: ["hyp-third-person-s"]
    });
    assert.equal(gate.status, "READY");

    const result = submitAnswer({
      events,
      session: s,
      task: gate.task,
      response: { selectedIndex: 1, selectedText: "B" },
      correct: true,
      safety: "SAFE"
    });
    events = result.events;
    assert.equal(result.state.lastCompletedPhase, phase);
    assert.equal(events.every(event => event.knowledgeItemId === "ki-present-simple"), true);
    assert.equal(events.every(event => event.hypothesisId === undefined || event.hypothesisId === "hyp-third-person-s"), true);
  }

  const finalDecision = (awaitableDecideNextAction)(events, s, taskBank);
  assert.equal(finalDecision.action, "STABILIZE");
  assert.equal(finalDecision.reason, "CYCLE_COMPLETE");
  assert.equal(events.filter(event => event.type === "ANSWER_SUBMITTED").length, 4);
  assert.equal(events.filter(event => event.type === "PHASE_COMPLETED").length, 4);
  assert.equal(validateEventStream(events).valid, true);
});

// Keep the integration test explicit: it calls the real deterministic decision engine.
function awaitableDecideNextAction(events, sessionValue, taskBank) {
  return decideNextAction({ events, session: sessionValue, safety: "SAFE", taskBank });
}


test("recovery escalation follows recorded history and never rewrites earlier answers", () => {
  const { gate } = resolveAndGate([item()]);
  const s = session();

  const first = submitAnswer({
    events: [], session: s, task: gate.task,
    response: { selectedIndex: 0, selectedText: "She work." },
    correct: false, safety: "SAFE"
  });
  const firstAnswer = first.events.find(event => event.type === "ANSWER_SUBMITTED");
  const firstRecovery = planRecovery({
    answerEvent: firstAnswer,
    userState: userState(),
    previousSupportLevel: "NONE"
  });

  assert.equal(firstRecovery.status, "READY");
  assert.equal(firstRecovery.nextLevel, first.state.lastSupportLevel);
  assert.equal(firstRecovery.nextLevel, "INDEPENDENT_RETRY");

  const immutableHistoryBeforeRetry = JSON.stringify(first.events);
  const second = submitAnswer({
    events: first.events, session: s, task: gate.task,
    response: { selectedIndex: 0, selectedText: "She work." },
    correct: false, safety: "SAFE"
  });
  const secondAnswer = second.events.filter(event => event.type === "ANSWER_SUBMITTED").at(-1);
  const secondRecovery = planRecovery({
    answerEvent: secondAnswer,
    userState: userState("CAUTION"),
    previousSupportLevel: first.state.lastSupportLevel
  });

  assert.equal(secondRecovery.status, "READY");
  assert.equal(secondRecovery.nextLevel, second.state.lastSupportLevel);
  assert.equal(secondRecovery.nextLevel, "MINIMAL_CUE");
  assert.equal(secondRecovery.strategy.preserveTarget, true);
  assert.equal(secondRecovery.notices.includes("REDUCE_SECONDARY_LOAD"), true);
  assert.equal(JSON.stringify(first.events), immutableHistoryBeforeRetry);
  assert.equal(second.events.length, first.events.length + 2);
  assert.equal(second.events.every(event => event.knowledgeItemId === "ki-present-simple"), true);
  assert.equal(validateEventStream(second.events).valid, true);
});


test("rehydrates the learning projection from a persisted event stream", async () => {
  const phases = ["NEW", "UNDERSTAND", "RECALL", "USE"];
  const items = phases.map((phase) => item({
    taskId: `task-${phase.toLowerCase()}`,
    phase,
    payload: { prompt: `Demonstration prompt for ${phase}`, choices: ["A", "B"] }
  }));
  const s = session();
  let events = [];

  for (const phase of phases) {
    const decision = decideNextAction({ events, session: s, safety: "SAFE", taskBank: items });
    assert.equal(decision.action, phase);
    const resolved = resolveContent(request(items, { phase }));
    assert.equal(resolved.status, "READY");
    const gate = validateTaskForDelivery({
      selectedTask: decision.task,
      contentPackage: resolved.package,
      userState: userState(),
      expectedContentVersion: "content-v1",
      expectedPhase: phase,
      allowedHypothesisIds: ["hyp-third-person-s"]
    });
    assert.equal(gate.status, "READY");

    const result = submitAnswer({
      events, session: s, task: gate.task,
      response: { selectedIndex: 1, selectedText: "B" },
      correct: true, safety: "SAFE"
    });
    events = result.events;
  }

  const expectedState = reconstructState(events, "ki-present-simple");
  assert.equal(expectedState.phase, "COMPLETE");
  assert.equal(expectedState.attempts, 4);

  // The adapter is an in-memory contract test double. Timestamps are assigned
  // monotonically in this test to make the persisted order deterministic.
  const store = new InMemoryPersistenceAdapter();
  const persistedEvents = events.map((event, index) => ({
    ...event,
    occurredAt: new Date(Date.UTC(2026, 9, 28, 12, 0, index)).toISOString(),
    userId: "test-user",
    deviceId: "test-device"
  }));
  await store.appendEvents(persistedEvents);

  const reloadedEvents = await store.readEvents({
    userId: "test-user",
    deviceId: "test-device",
    knowledgeItemId: "ki-present-simple"
  });
  assert.deepEqual(reloadedEvents.map(event => event.eventId), persistedEvents.map(event => event.eventId));
  assert.deepEqual(reconstructState(reloadedEvents, "ki-present-simple"), expectedState);
  assert.equal(decideNextAction({ events: reloadedEvents, session: s, safety: "SAFE", taskBank: items }).action, "STABILIZE");
  assert.equal(validateEventStream(reloadedEvents).valid, true);
});


test("history read failure does not publish a partial snapshot", async () => {
  const store = new InMemoryPersistenceAdapter();
  await store.appendEvents([{
    eventId: "evt-recovery-boundary-1",
    type: "ANSWER_SUBMITTED",
    occurredAt: "2026-10-28T12:00:00.000Z",
    schemaVersion: 1,
    coreVersion: "0.1.0",
    userId: "recovery-test-user",
    deviceId: "recovery-test-device",
    sessionId: "recovery-test-session",
    knowledgeItemId: "ki-present-simple",
    phase: "NEW",
    correct: false
  }]);

  store.failNextOperation("readEvents", "HISTORY_UNAVAILABLE");
  let projectorCalled = false;
  await assert.rejects(
    store.rebuildSnapshot("recovery-snapshot", async (events) => {
      projectorCalled = true;
      return reconstructState(events, "ki-present-simple");
    }, { userId: "recovery-test-user", knowledgeItemId: "ki-present-simple" }),
    (error) => error.code === "HISTORY_UNAVAILABLE" && error.operation === "readEvents"
  );

  assert.equal(projectorCalled, false);
  assert.equal(await store.readSnapshot("recovery-snapshot", "recovery-test-user"), null);
  assert.equal((await store.verifyIntegrity()).valid, true);
});

test("repeated reconstruction is deterministic and returned event copies cannot mutate stored history", async () => {
  const store = new InMemoryPersistenceAdapter();
  const events = [
    {
      eventId: "evt-determinism-answer",
      type: "ANSWER_SUBMITTED",
      occurredAt: "2026-10-28T12:00:00.000Z",
      schemaVersion: 1,
      coreVersion: "0.1.0",
      userId: "determinism-user",
      deviceId: "determinism-device",
      sessionId: "determinism-session",
      knowledgeItemId: "ki-present-simple",
      phase: "NEW",
      correct: false
    },
    {
      eventId: "evt-determinism-support",
      type: "RECOVERY_SUPPORT_USED",
      occurredAt: "2026-10-28T12:00:01.000Z",
      schemaVersion: 1,
      coreVersion: "0.1.0",
      userId: "determinism-user",
      deviceId: "determinism-device",
      sessionId: "determinism-session",
      knowledgeItemId: "ki-present-simple",
      phase: "NEW",
      supportLevel: "INDEPENDENT_RETRY",
      triggerEventId: "evt-determinism-answer"
    }
  ];
  await store.appendEvents(events);

  const query = { userId: "determinism-user", knowledgeItemId: "ki-present-simple" };
  const firstRead = await store.readEvents(query);
  const secondRead = await store.readEvents(query);
  const firstProjection = reconstructState(firstRead, "ki-present-simple");
  const secondProjection = reconstructState(secondRead, "ki-present-simple");

  assert.deepEqual(firstProjection, secondProjection);
  assert.deepEqual(firstRead.map(event => event.eventId), secondRead.map(event => event.eventId));

  firstRead[0].correct = true;
  firstRead[0].response = { tampered: true };
  const storedAgain = await store.readEvents(query);
  assert.equal(storedAgain[0].correct, false);
  assert.equal(storedAgain[0].response, undefined);
  assert.equal((await store.verifyIntegrity()).valid, true);
});
