/**
 * Grammar Trail Recovery Runtime v0.1
 * Chooses a bounded support strategy after an answer has been recorded.
 * It never edits history, changes correctness, or supplies the final answer.
 */
export const RECOVERY_RUNTIME_VERSION = "0.1.0";
const LEVELS = Object.freeze([
  "INDEPENDENT_RETRY",
  "MINIMAL_CUE",
  "SIMPLIFIED_CONTEXT",
  "CONTRAST_EXPLANATION",
  "GUIDED_RECONSTRUCTION"
]);
const SAFE_STATES = new Set(["SAFE", "READY"]);
const CAUTION_STATES = new Set(["CAUTION", "FATIGUED", "RECOVERING", "STABILIZING"]);
const BLOCKED_STATES = new Set(["UNSAFE", "OVERLOADED", "CLOSING"]);

const STRATEGIES = Object.freeze({
  INDEPENDENT_RETRY: { action: "RETRY", promptStyle: "SAME_TASK_NO_EXTRA_HINT", preserveTarget: true },
  MINIMAL_CUE: { action: "RETRY", promptStyle: "ONE_NON_ANSWER_GIVING_CUE", preserveTarget: true },
  SIMPLIFIED_CONTEXT: { action: "RETRY", promptStyle: "SIMPLIFY_CONTEXT_KEEP_HYPOTHESIS", preserveTarget: true },
  CONTRAST_EXPLANATION: { action: "RETRY", promptStyle: "EXPLAIN_RELEVANT_CONTRAST_WITHOUT_GIVING_ANSWER", preserveTarget: true },
  GUIDED_RECONSTRUCTION: { action: "RETRY", promptStyle: "BREAK_REASONING_INTO_SMALL_STEPS", preserveTarget: true }
});

function reject(code, detail) {
  return Object.freeze({ status: "BLOCKED", code, detail });
}

/**
 * Input requires a recorded incorrect response and the exact event ID.
 * The caller must provide a support level based on immutable history, not infer
 * a learner trait from a single error.
 */
export function planRecovery({ answerEvent, userState, previousSupportLevel = "NONE", supportLimit = null }) {
  if (!answerEvent || answerEvent.type !== "ANSWER_SUBMITTED" || !answerEvent.eventId) {
    return reject("ANSWER_EVENT_REQUIRED", "Recovery requires a persisted answer event.");
  }
  if (answerEvent.correct !== false) {
    return reject("RECOVERY_ONLY_AFTER_INCORRECT", "Recovery support is planned only after an incorrect response.");
  }
  if (!userState || typeof userState.state !== "string") {
    return reject("USER_STATE_REQUIRED", "Evaluate User State before selecting recovery support.");
  }
  if (BLOCKED_STATES.has(userState.state)) {
    return reject("SAFETY_BLOCK", "Do not introduce another task while the current state blocks learning.");
  }
  if (!SAFE_STATES.has(userState.state) && !CAUTION_STATES.has(userState.state)) {
    return reject("UNKNOWN_USER_STATE", "Unknown User State must not silently pass the safety gate.");
  }
  if (!LEVELS.includes(previousSupportLevel) && previousSupportLevel !== "NONE") {
    return reject("UNKNOWN_SUPPORT_LEVEL", "Previous support level is not recognized.");
  }
  if (supportLimit !== null && (!Number.isInteger(supportLimit) || supportLimit < 0 || supportLimit >= LEVELS.length)) {
    return reject("INVALID_SUPPORT_LIMIT", "Support limit must be null or an integer from 0 to 4.");
  }
  const previousIndex = previousSupportLevel === "NONE" ? -1 : LEVELS.indexOf(previousSupportLevel);
  const nextIndex = Math.min(previousIndex + 1, LEVELS.length - 1);
  if (supportLimit !== null && nextIndex > supportLimit) {
    return Object.freeze({
      status: "PAUSE_RECOMMENDED",
      code: "SUPPORT_LIMIT_REACHED",
      triggerEventId: answerEvent.eventId,
      recommendation: "OFFER_PAUSE_OR_END_SESSION",
      nextLevel: null
    });
  }
  const nextLevel = LEVELS[nextIndex];
  const caution = CAUTION_STATES.has(userState.state);
  return Object.freeze({
    status: "READY",
    triggerEventId: answerEvent.eventId,
    nextLevel,
    strategy: STRATEGIES[nextLevel],
    notices: Object.freeze(caution ? ["REDUCE_SECONDARY_LOAD", "KEEP_ONE_TASK_AND_ONE_HYPOTHESIS"] : ["KEEP_ONE_TASK_AND_ONE_HYPOTHESIS"]),
    invariants: Object.freeze([
      "DO_NOT_EDIT_OR_DELETE_HISTORY",
      "DO_NOT_CHANGE_RECORDED_CORRECTNESS",
      "DO_NOT_REVEAL_FINAL_ANSWER",
      "PRESERVE_MAIN_HYPOTHESIS"
    ])
  });
}

export function recoveryLevelSequence() {
  return LEVELS.slice();
}
