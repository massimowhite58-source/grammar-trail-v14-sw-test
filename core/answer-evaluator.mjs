/**
 * Grammar Trail Answer Evaluator v0.1
 * Pure deterministic matcher for normalized, authored evaluation descriptors.
 * It never edits the raw learner response and never guesses open-ended meaning.
 */
export const ANSWER_EVALUATOR_VERSION = "0.1.0";
const MODES = new Set(["CHOICE", "BLANKS", "MATCHING", "TRANSFORM", "MULTI_PART", "OPEN_RESPONSE"]);

function result(status, outcome = null, taskCorrect = null, parts = [], reason = null) {
  return Object.freeze({ status, outcome, taskCorrect, parts: Object.freeze(parts), reason, evaluatorVersion: ANSWER_EVALUATOR_VERSION });
}
function isObject(value) { return value !== null && typeof value === "object" && !Array.isArray(value); }
function readPath(value, path) {
  if (!path) return value;
  return path.split(".").reduce((current, key) => current == null ? undefined : current[key], value);
}
function normalize(value, rules = {}) {
  if (typeof value !== "string") return value;
  let out = value;
  if (rules.trim === true) out = out.trim();
  if (rules.collapseInternalWhitespace === true) out = out.replace(/\s+/g, " ");
  if (rules.caseInsensitive === true) out = out.toLocaleLowerCase("en");
  if (rules.ignorePunctuation === true) out = out.replace(/\\p{P}/gu, "");
  return out;
}
function stableValue(value, rules = {}) {
  const normalized = normalize(value, rules);
  if (Array.isArray(normalized)) {
    const items = normalized.map(item => stableValue(item, {}));
    return rules.unorderedArray === true ? items.sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b))) : items;
  }
  if (isObject(normalized)) {
    return Object.fromEntries(Object.keys(normalized).sort().map(key => [key, stableValue(normalized[key], {})]));
  }
  return normalized;
}
function equal(actual, expected, rules) {
  return JSON.stringify(stableValue(actual, rules)) === JSON.stringify(stableValue(expected, rules));
}
function validateDescriptor(descriptor) {
  if (!descriptor || !MODES.has(descriptor.mode)) return "EVALUATION_MODE_UNSUPPORTED";
  if (descriptor.mode === "OPEN_RESPONSE") return null;
  if (!Array.isArray(descriptor.parts) || descriptor.parts.length === 0) return "EVALUATION_PARTS_REQUIRED";
  const ids = new Set();
  for (const part of descriptor.parts) {
    if (!part || typeof part.partId !== "string" || !part.partId.trim() || ids.has(part.partId)) return "PART_ID_MISSING_OR_DUPLICATE";
    ids.add(part.partId);
    if (!Array.isArray(part.accepted) || part.accepted.length === 0 || part.accepted.some(item => !isObject(item) || !Object.hasOwn(item, "value"))) return "ACCEPTED_ANSWERS_REQUIRED";
    if (part.responsePath !== undefined && typeof part.responsePath !== "string") return "RESPONSE_PATH_INVALID";
  }
  return null;
}

/**
 * task.evaluation is a normalized descriptor produced by a versioned content adapter.
 * Response is treated as read-only input and is not normalized in-place.
 */
export function evaluateAnswer({ task, response, evaluatorVersion = ANSWER_EVALUATOR_VERSION }) {
  if (!task || typeof task.taskId !== "string" || typeof task.contentVersion !== "string") {
    return result("REJECTED", null, null, [], "TASK_ID_AND_CONTENT_VERSION_REQUIRED");
  }
  const descriptor = task.evaluation;
  const invalid = validateDescriptor(descriptor);
  if (invalid) return result(invalid === "EVALUATION_MODE_UNSUPPORTED" ? "REJECTED" : "REVIEW_REQUIRED", null, null, [], invalid);
  if (descriptor.mode === "OPEN_RESPONSE") return result("REVIEW_REQUIRED", null, null, [], "OPEN_RESPONSE_REQUIRES_AUTHORED_DETERMINISTIC_RUBRIC");

  const parts = descriptor.parts.map(part => {
    const actual = readPath(response, part.responsePath ?? part.partId);
    const matchedIndex = part.accepted.findIndex(candidate => equal(actual, candidate.value, part.normalization ?? {}));
    return Object.freeze({
      partId: part.partId,
      outcome: actual === undefined ? "REVIEW_REQUIRED" : matchedIndex >= 0 ? "CORRECT" : "INCORRECT",
      matchedAlternativeId: matchedIndex >= 0 ? (part.accepted[matchedIndex].alternativeId ?? null) : null,
      responsePath: part.responsePath ?? part.partId
    });
  });

  if (parts.some(part => part.outcome === "REVIEW_REQUIRED")) {
    return Object.freeze({ ...result("REVIEW_REQUIRED", null, null, parts, "RESPONSE_PART_MISSING"), evaluatorVersion, contentVersion: task.contentVersion, taskId: task.taskId });
  }
  const correctCount = parts.filter(part => part.outcome === "CORRECT").length;
  const taskCorrect = correctCount === parts.length;
  const outcome = taskCorrect ? "CORRECT" : correctCount > 0 ? "PARTIALLY_CORRECT" : "INCORRECT";
  return Object.freeze({
    ...result("EVALUATED", outcome, taskCorrect, parts),
    evaluatorVersion,
    contentVersion: task.contentVersion,
    taskId: task.taskId,
    evaluationRuleVersion: descriptor.ruleVersion ?? "UNVERSIONED"
  });
}
