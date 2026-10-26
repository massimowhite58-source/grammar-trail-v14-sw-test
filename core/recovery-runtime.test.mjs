import test from "node:test";
import assert from "node:assert/strict";
import { planRecovery, recoveryLevelSequence } from "./recovery-runtime.mjs";

const answer = (overrides = {}) => ({ eventId: "evt-answer-1", type: "ANSWER_SUBMITTED", correct: false, ...overrides });
const state = (value = "SAFE") => ({ state: value });

test("starts with an independent retry after the first incorrect answer", () => {
  const result = planRecovery({ answerEvent: answer(), userState: state() });
  assert.equal(result.status, "READY");
  assert.equal(result.nextLevel, "INDEPENDENT_RETRY");
  assert.equal(result.triggerEventId, "evt-answer-1");
});

test("does not infer learner traits or change the target", () => {
  const result = planRecovery({ answerEvent: answer(), userState: state() });
  assert.equal(result.strategy.preserveTarget, true);
  assert.ok(result.invariants.includes("DO_NOT_CHANGE_RECORDED_CORRECTNESS"));
});

test("requires a recorded incorrect answer event", () => {
  assert.equal(planRecovery({ answerEvent: null, userState: state() }).code, "ANSWER_EVENT_REQUIRED");
  assert.equal(planRecovery({ answerEvent: answer({ correct: true }), userState: state() }).code, "RECOVERY_ONLY_AFTER_INCORRECT");
});

test("requires User State and blocks unsafe or overloaded states", () => {
  assert.equal(planRecovery({ answerEvent: answer(), userState: null }).code, "USER_STATE_REQUIRED");
  assert.equal(planRecovery({ answerEvent: answer(), userState: state("UNSAFE") }).code, "SAFETY_BLOCK");
  assert.equal(planRecovery({ answerEvent: answer(), userState: state("OVERLOADED") }).code, "SAFETY_BLOCK");
});

test("unknown state fails closed", () => {
  assert.equal(planRecovery({ answerEvent: answer(), userState: state("UNKNOWN") }).code, "UNKNOWN_USER_STATE");
});

test("advances support gradually without exceeding the ladder", () => {
  assert.equal(planRecovery({ answerEvent: answer(), userState: state(), previousSupportLevel: "INDEPENDENT_RETRY" }).nextLevel, "MINIMAL_CUE");
  assert.equal(planRecovery({ answerEvent: answer(), userState: state(), previousSupportLevel: "GUIDED_RECONSTRUCTION" }).nextLevel, "GUIDED_RECONSTRUCTION");
  assert.deepEqual(recoveryLevelSequence(), ["INDEPENDENT_RETRY", "MINIMAL_CUE", "SIMPLIFIED_CONTEXT", "CONTRAST_EXPLANATION", "GUIDED_RECONSTRUCTION"]);
});

test("caution state reduces secondary load", () => {
  const result = planRecovery({ answerEvent: answer(), userState: state("CAUTION") });
  assert.ok(result.notices.includes("REDUCE_SECONDARY_LOAD"));
});

test("support limit recommends pause instead of escalating indefinitely", () => {
  const result = planRecovery({ answerEvent: answer(), userState: state(), previousSupportLevel: "CONTRAST_EXPLANATION", supportLimit: 2 });
  assert.equal(result.status, "PAUSE_RECOMMENDED");
  assert.equal(result.recommendation, "OFFER_PAUSE_OR_END_SESSION");
});

test("rejects unknown levels and invalid support limits", () => {
  assert.equal(planRecovery({ answerEvent: answer(), userState: state(), previousSupportLevel: "MAGIC_HINT" }).code, "UNKNOWN_SUPPORT_LEVEL");
  assert.equal(planRecovery({ answerEvent: answer(), userState: state(), supportLimit: -1 }).code, "INVALID_SUPPORT_LIMIT");
});
