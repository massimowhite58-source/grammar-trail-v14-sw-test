/**
 * Grammar Trail Answer Evaluator v0.2
 * Deterministic evaluator with independently reported assessment dimensions.
 * Raw learner responses are read-only and never rewritten.
 */
export const ANSWER_EVALUATOR_VERSION = "0.2.0";
const MODES = new Set(["CHOICE", "BLANKS", "MATCHING", "TRANSFORM", "MULTI_PART", "OPEN_RESPONSE"]);

function result(status, outcome = null, taskCorrect = null, parts = [], reason = null, dimensions = {}, taskSatisfied = null) {
  return Object.freeze({
    status, outcome, taskCorrect, taskSatisfied, parts: Object.freeze(parts), reason,
    dimensions: Object.freeze(dimensions), evaluatorVersion: ANSWER_EVALUATOR_VERSION
  });
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
  if (rules.ignorePunctuation === true) out = out.replace(/\p{P}/gu, "");
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
function validateAccepted(accepted) {
  return Array.isArray(accepted) && accepted.length > 0 &&
    !accepted.some(item => !isObject(item) || !Object.hasOwn(item, "value"));
}
function validateDescriptor(descriptor) {
  if (!descriptor || !MODES.has(descriptor.mode)) return "EVALUATION_MODE_UNSUPPORTED";
  if (descriptor.mode === "OPEN_RESPONSE") return null;
  if (!Array.isArray(descriptor.parts) || descriptor.parts.length === 0) return "EVALUATION_PARTS_REQUIRED";
  if (descriptor.requiredAxes !== undefined &&
      (!Array.isArray(descriptor.requiredAxes) || descriptor.requiredAxes.length === 0 ||
       descriptor.requiredAxes.some(axis => typeof axis !== "string" || !axis.trim()) ||
       new Set(descriptor.requiredAxes).size !== descriptor.requiredAxes.length)) {
    return "REQUIRED_AXES_INVALID";
  }
  const ids = new Set();
  for (const part of descriptor.parts) {
    if (!part || typeof part.partId !== "string" || !part.partId.trim() || ids.has(part.partId)) return "PART_ID_MISSING_OR_DUPLICATE";
    ids.add(part.partId);
    if (part.responsePath !== undefined && typeof part.responsePath !== "string") return "RESPONSE_PATH_INVALID";
    if (part.axes !== undefined) {
      if (!isObject(part.axes) || Object.keys(part.axes).length === 0) return "ASSESSMENT_AXES_INVALID";
      for (const [axis, axisDescriptor] of Object.entries(part.axes)) {
        if (!axis.trim() || !isObject(axisDescriptor) || !validateAccepted(axisDescriptor.accepted)) return "ASSESSMENT_AXIS_DESCRIPTOR_INVALID";
      }
      if (part.primaryAxis !== undefined && !Object.hasOwn(part.axes, part.primaryAxis)) return "PRIMARY_AXIS_UNKNOWN";
      if (part.primaryAxis === undefined && !Object.hasOwn(part.axes, "answer")) return "PRIMARY_AXIS_UNKNOWN";
      if (descriptor.requiredAxes?.some(axis => !Object.hasOwn(part.axes, axis))) return "REQUIRED_AXIS_MISSING_FROM_PART";
    } else {
      if (descriptor.requiredAxes?.length) return "REQUIRED_AXIS_MISSING_FROM_PART";
      if (!validateAccepted(part.accepted)) return "ACCEPTED_ANSWERS_REQUIRED";
    }
  }
  return null;
}
function assessAxis(actual, axisDescriptor) {
  const matchedIndex = axisDescriptor.accepted.findIndex(candidate =>
    equal(actual, candidate.value, axisDescriptor.normalization ?? {})
  );
  return Object.freeze({
    outcome: actual === undefined ? "REVIEW_REQUIRED" : matchedIndex >= 0 ? "CORRECT" : "INCORRECT",
    matchedAlternativeId: matchedIndex >= 0 ? (axisDescriptor.accepted[matchedIndex].alternativeId ?? null) : null
  });
}

/**
 * Legacy descriptors without axes retain the original single-answer behavior.
 * When axes are authored, each is assessed independently. The part outcome and
 * task outcome follow primaryAxis (default: "answer"); dimensions expose all axes.
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
    const axes = part.axes ?? { answer: { accepted: part.accepted, normalization: part.normalization } };
    const axisResults = Object.fromEntries(Object.entries(axes).map(([axis, axisDescriptor]) =>
      [axis, assessAxis(actual, axisDescriptor)]
    ));
    const primaryAxis = part.primaryAxis ?? "answer";
    const primary = axisResults[primaryAxis];
    return Object.freeze({
      partId: part.partId,
      outcome: primary.outcome,
      matchedAlternativeId: primary.matchedAlternativeId,
      responsePath: part.responsePath ?? part.partId,
      primaryAxis,
      axes: Object.freeze(axisResults)
    });
  });

  if (parts.some(part => Object.values(part.axes).some(axis => axis.outcome === "REVIEW_REQUIRED"))) {
    return Object.freeze({ ...result("REVIEW_REQUIRED", null, null, parts, "RESPONSE_PART_MISSING"), evaluatorVersion, contentVersion: task.contentVersion, taskId: task.taskId });
  }

  const dimensions = {};
  for (const part of parts) {
    for (const [axis, assessment] of Object.entries(part.axes)) {
      const aggregate = dimensions[axis] ?? { correctCount: 0, incorrectCount: 0, partCount: 0 };
      aggregate.partCount += 1;
      if (assessment.outcome === "CORRECT") aggregate.correctCount += 1;
      else aggregate.incorrectCount += 1;
      dimensions[axis] = aggregate;
    }
  }
  for (const [axis, aggregate] of Object.entries(dimensions)) {
    aggregate.outcome = aggregate.incorrectCount === 0 ? "CORRECT" :
      aggregate.correctCount === 0 ? "INCORRECT" : "PARTIALLY_CORRECT";
    Object.freeze(aggregate);
  }

  const correctCount = parts.filter(part => part.outcome === "CORRECT").length;
  const taskCorrect = correctCount === parts.length;
  const outcome = taskCorrect ? "CORRECT" : correctCount > 0 ? "PARTIALLY_CORRECT" : "INCORRECT";
  const requiredAxes = descriptor.requiredAxes ?? [];
  const taskSatisfied = requiredAxes.length === 0 ? taskCorrect :
    requiredAxes.every(axis => dimensions[axis]?.outcome === "CORRECT");
  return Object.freeze({
    ...result("EVALUATED", outcome, taskCorrect, parts, null, dimensions, taskSatisfied),
    evaluatorVersion,
    contentVersion: task.contentVersion,
    taskId: task.taskId,
    evaluationRuleVersion: descriptor.ruleVersion ?? "UNVERSIONED"
  });
}
