/**
 * Grammar Trail — deterministic learning core v0.1
 * No network, AI provider, or mutable external dependency.
 *
 * Historical truth is the append-only event stream. Snapshots are derived
 * and can always be reconstructed. This module is intentionally independent
 * of the UI and content store so it can be tested before integration.
 */

export const CORE_VERSION = "0.1.0";
export const PHASES = Object.freeze(["NEW", "UNDERSTAND", "RECALL", "USE"]);
export const SAFETY = Object.freeze({ SAFE: "SAFE", CAUTION: "CAUTION", UNSAFE: "UNSAFE" });

const clone = (value) => JSON.parse(JSON.stringify(value));
const nowIso = () => new Date().toISOString();

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function normalizeEvent(event) {
  return Object.freeze(clone(event));
}

/** Append a new event without modifying any previously recorded event. */
export function appendEvent(events, event) {
  assert(Array.isArray(events), "events must be an array");
  assert(event && typeof event.type === "string", "event.type is required");
  const next = {
    eventId: event.eventId ?? createEventId(),
    occurredAt: event.occurredAt ?? nowIso(),
    schemaVersion: 1,
    coreVersion: CORE_VERSION,
    ...clone(event),
  };
  assert(!events.some((e) => e.eventId === next.eventId), "duplicate eventId");
  return [...events, normalizeEvent(next)];
}

function createEventId() {
  // Unique enough for a local prototype; replace with UUID in persistence adapter.
  return "evt_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 10);
}

/**
 * Initial state is a projection, not historical truth.
 * The same event list always reconstructs the same learning facts.
 */
export function reconstructState(events, knowledgeItemId) {
  const relevant = events.filter((e) => e.knowledgeItemId === knowledgeItemId);
  const attempts = relevant.filter((e) => e.type === "ANSWER_SUBMITTED");
  const latestPhaseEvent = [...relevant].reverse().find((e) => e.type === "PHASE_COMPLETED");
  const completedPhases = new Set(relevant.filter((e) => e.type === "PHASE_COMPLETED").map((e) => e.phase));
  const phase = PHASES.find((p) => !completedPhases.has(p)) ?? "COMPLETE";
  const correct = attempts.filter((e) => e.correct === true).length;
  const incorrect = attempts.filter((e) => e.correct === false).length;
  const latest = attempts.at(-1) ?? null;

  return Object.freeze({
    knowledgeItemId,
    phase,
    completedPhases: PHASES.filter((p) => completedPhases.has(p)),
    attempts: attempts.length,
    correctAttempts: correct,
    incorrectAttempts: incorrect,
    latestAnswerCorrect: latest?.correct ?? null,
    lastCompletedPhase: latestPhaseEvent?.phase ?? null,
    lastSupportLevel: [...relevant].reverse().find((e) => e.type === "RECOVERY_SUPPORT_USED")?.supportLevel ?? "NONE",
    status: phase === "COMPLETE" ? "PRACTICE_CYCLE_COMPLETE" : "IN_PROGRESS",
  });
}

export function createSession({ sessionId = createEventId(), knowledgeItemId, contentVersion, algorithmVersion = CORE_VERSION }) {
  assert(typeof knowledgeItemId === "string" && knowledgeItemId.trim(), "knowledgeItemId is required");
  assert(typeof contentVersion === "string" && contentVersion.trim(), "contentVersion is required");
  return Object.freeze({ sessionId, knowledgeItemId, contentVersion, algorithmVersion, startedAt: nowIso() });
}

/**
 * Decision order: safety first, then current phase.
 * A deliberately small v0.1: no early mixing and one knowledge hypothesis per task.
 */
export function decideNextAction({ events = [], session, safety = SAFETY.SAFE, taskBank }) {
  assert(session?.knowledgeItemId, "session is required");
  if (safety === SAFETY.UNSAFE) return { action: "CLOSE_SESSION", reason: "SAFETY_BLOCK", task: null };
  if (safety === SAFETY.CAUTION) return { action: "REDUCE_LOAD", reason: "SAFETY_CAUTION", task: null };

  const state = reconstructState(events, session.knowledgeItemId);
  if (state.phase === "COMPLETE") return { action: "STABILIZE", reason: "CYCLE_COMPLETE", task: null, state };

  const candidates = (taskBank ?? []).filter((task) =>
    task.knowledgeItemId === session.knowledgeItemId &&
    task.phase === state.phase &&
    task.approvalState === "APPROVED" &&
    task.contentVersion === session.contentVersion &&
    task.hypothesisId
  );
  if (candidates.length === 0) {
    return { action: "CONTENT_UNAVAILABLE", reason: "NO_APPROVED_TASK_FOR_PHASE", task: null, state };
  }
  // Stable deterministic choice: sort by taskId, then select first.
  candidates.sort((a, b) => a.taskId.localeCompare(b.taskId));
  return { action: state.phase, reason: "CURRENT_PHASE", task: clone(candidates[0]), state };
}

/**
 * Records a learner response as a fact and derives a next-step recommendation.
 * Correctness is explicit from the authored task evaluator; response time does
 * not lower mastery. An error never removes previously earned evidence.
 */
export function submitAnswer({ events = [], session, task, response, correct, durationMs = null, safety = SAFETY.SAFE }) {
  assert(session?.knowledgeItemId && task?.taskId, "session and task are required");
  assert(task.knowledgeItemId === session.knowledgeItemId, "task must target the active knowledge item");
  assert(task.contentVersion === session.contentVersion, "task content version must match session");
  assert(task.approvalState === "APPROVED", "unapproved content cannot be used in learner-facing tasks");
  assert(typeof correct === "boolean", "correct must be a boolean result from a deterministic evaluator");
  assert(durationMs === null || (Number.isFinite(durationMs) && durationMs >= 0), "durationMs must be non-negative or null");

  const stateBefore = reconstructState(events, session.knowledgeItemId);
  assert(stateBefore.phase === task.phase, "task phase does not match current learning phase");
  if (safety === SAFETY.UNSAFE) {
    return { events, state: stateBefore, decision: { action: "CLOSE_SESSION", reason: "SAFETY_BLOCK", task: null } };
  }

  const withAnswer = appendEvent(events, {
    type: "ANSWER_SUBMITTED",
    sessionId: session.sessionId,
    knowledgeItemId: session.knowledgeItemId,
    taskId: task.taskId,
    hypothesisId: task.hypothesisId,
    phase: task.phase,
    response: clone(response),
    correct,
    durationMs,
    contentVersion: task.contentVersion,
    algorithmVersion: session.algorithmVersion,
  });

  let nextEvents = withAnswer;
  if (correct) {
    nextEvents = appendEvent(nextEvents, {
      type: "PHASE_COMPLETED",
      sessionId: session.sessionId,
      knowledgeItemId: session.knowledgeItemId,
      phase: task.phase,
      taskId: task.taskId,
      evidenceType: task.phase === "USE" ? "APPLIED_USE" : task.phase === "RECALL" ? "INDEPENDENT_RECALL" : "PHASE_RESPONSE",
      contentVersion: task.contentVersion,
      algorithmVersion: session.algorithmVersion,
    });
  } else {
    const supportLevel = nextSupportLevel(stateBefore.lastSupportLevel);
    nextEvents = appendEvent(nextEvents, {
      type: "RECOVERY_SUPPORT_USED",
      sessionId: session.sessionId,
      knowledgeItemId: session.knowledgeItemId,
      phase: task.phase,
      taskId: task.taskId,
      supportLevel,
      triggerEventId: withAnswer.at(-1).eventId,
      algorithmVersion: session.algorithmVersion,
    });
  }

  const state = reconstructState(nextEvents, session.knowledgeItemId);
  const decision = decideNextAction({ events: nextEvents, session, safety, taskBank: [] });
  if (state.phase !== "COMPLETE" && correct) {
    return { events: nextEvents, state, decision: { action: state.phase, reason: "PHASE_ADVANCED", task: null } };
  }
  if (!correct) {
    return { events: nextEvents, state, decision: { action: "RECOVER", reason: "ANSWER_NEEDS_SUPPORT", supportLevel: state.lastSupportLevel, task: null } };
  }
  return { events: nextEvents, state, decision };
}

function nextSupportLevel(previous) {
  const ladder = ["NONE", "INDEPENDENT_RETRY", "MINIMAL_CUE", "SIMPLIFIED_CONTEXT", "CONTRAST_EXPLANATION", "GUIDED_RECONSTRUCTION"];
  const index = ladder.indexOf(previous);
  return ladder[Math.min(index + 1, ladder.length - 1)];
}

/** Validate the invariants needed before connecting this module to UI/storage. */
export function validateEventStream(events) {
  const ids = new Set();
  for (const event of events) {
    if (!event.eventId || ids.has(event.eventId)) return { valid: false, reason: "MISSING_OR_DUPLICATE_EVENT_ID" };
    ids.add(event.eventId);
    if (!event.type || !event.knowledgeItemId || !event.occurredAt) return { valid: false, reason: "REQUIRED_EVENT_FIELD_MISSING" };
    if (event.type === "ANSWER_SUBMITTED" && typeof event.correct !== "boolean") return { valid: false, reason: "ANSWER_CORRECTNESS_MISSING" };
  }
  return { valid: true, eventCount: events.length };
}
