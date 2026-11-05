/**
 * Grammar Trail Diagnostic Classifier v0.2
 * Applies only explicit, deterministic, authored conditions to raw response evidence.
 */
export const DIAGNOSTIC_CLASSIFIER_VERSION = "0.2.0";

const RESERVED_NON_ERROR_TAGS = new Set([
  "GRAMMAR_ACCURACY", "COMMUNICATION_COMPLETION", "CONTEXT_TRANSFER", "MIXED_FORM_SELECTION"
]);
const SCOPES = new Set(["TARGET_HYPOTHESIS", "OUTSIDE_TARGET", "INSTRUCTION", "COMMUNICATION"]);
function isObject(value) { return value !== null && typeof value === "object" && !Array.isArray(value); }
function readPath(value, path) {
  if (!path) return undefined;
  return path.split(".").reduce((current, key) => current == null ? undefined : current[key], value);
}
function normalize(value, rules = {}) {
  if (typeof value !== "string") return value;
  let out = value;
  if (rules.trim === true) out = out.trim();
  if (rules.collapseInternalWhitespace === true) out = out.replace(/\\s+/g, " ");
  if (rules.caseInsensitive === true) out = out.toLocaleLowerCase("en");
  return out;
}
function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (isObject(value)) return Object.fromEntries(Object.keys(value).sort().map(key => [key, stable(value[key])]));
  return value;
}
function same(a, b, normalization) {
  return JSON.stringify(stable(normalize(a, normalization))) === JSON.stringify(stable(normalize(b, normalization)));
}
function validateCondition(condition) {
  if (!isObject(condition)) return false;
  if (condition.operator === "equals") return Object.hasOwn(condition, "value");
  if (condition.operator === "oneOf" || condition.operator === "notOneOf") {
    return Array.isArray(condition.values) && condition.values.length > 0;
  }
  return false;
}
function matchesCondition(observed, condition) {
  const rules = condition.normalization ?? {};
  if (condition.operator === "equals") return same(observed, condition.value, rules);
  const found = condition.values.some(value => same(observed, value, rules));
  return condition.operator === "oneOf" ? found : !found;
}
function review(answerEventId, reason) {
  return Object.freeze({ status: "REVIEW_REQUIRED", answerEventId, records: Object.freeze([]), reason });
}

export function classifyDiagnostics({
  task, rawResponse, evaluation, answerEventId,
  diagnosticTaxonomyVersion, allowedErrorTags, classifierVersion = DIAGNOSTIC_CLASSIFIER_VERSION
}) {
  if (!answerEventId || typeof answerEventId !== "string") return review(null, "ANSWER_EVENT_ID_REQUIRED");
  if (!task?.evaluation || !Array.isArray(task.evaluation.parts) ||
      !evaluation || evaluation.status !== "EVALUATED" || !Array.isArray(evaluation.parts)) {
    return review(answerEventId, "VALID_EVALUATION_REQUIRED");
  }
  if (!diagnosticTaxonomyVersion || typeof diagnosticTaxonomyVersion !== "string" ||
      !Array.isArray(allowedErrorTags) || allowedErrorTags.length === 0) {
    return review(answerEventId, "TAXONOMY_VERSION_AND_ALLOWED_TAGS_REQUIRED");
  }

  const records = [];
  const seen = new Set();
  for (const partResult of evaluation.parts) {
    if (partResult.outcome === "REVIEW_REQUIRED") return review(answerEventId, "PART_EVALUATION_REQUIRES_REVIEW");
    if (partResult.outcome !== "INCORRECT") continue;
    const descriptorPart = task.evaluation.parts.find(part => part.partId === partResult.partId);
    if (!descriptorPart || !Array.isArray(descriptorPart.diagnostics)) {
      return review(answerEventId, "AUTHORED_DIAGNOSTIC_RULES_MISSING");
    }
    for (const rule of descriptorPart.diagnostics) {
      if (!rule || typeof rule.diagnosticId !== "string" || !rule.diagnosticId.trim() ||
          typeof rule.errorTag !== "string" || !rule.errorTag.trim() ||
          typeof rule.expectedRuleRef !== "string" || !rule.expectedRuleRef.trim() ||
          typeof rule.responsePath !== "string" || !rule.responsePath.trim() ||
          !SCOPES.has(rule.scope) || !validateCondition(rule.when)) {
        return review(answerEventId, "AUTHORED_DIAGNOSTIC_RULE_INVALID");
      }
      if (RESERVED_NON_ERROR_TAGS.has(rule.errorTag) || !allowedErrorTags.includes(rule.errorTag)) {
        return review(answerEventId, "NON_DIAGNOSTIC_TAG_USED_AS_ERROR");
      }
      if (seen.has(rule.diagnosticId)) return review(answerEventId, "DUPLICATE_DIAGNOSTIC_ID");
      seen.add(rule.diagnosticId);
      const observed = readPath(rawResponse, rule.responsePath);
      if (observed === undefined) return review(answerEventId, "DIAGNOSTIC_EVIDENCE_MISSING");
      if (!matchesCondition(observed, rule.when)) continue;
      records.push(Object.freeze({
        diagnosticId: rule.diagnosticId,
        answerEventId,
        taskId: task.taskId,
        partId: partResult.partId,
        errorTag: rule.errorTag,
        evidence: Object.freeze({
          responsePath: rule.responsePath,
          observedValue: observed,
          expectedRuleRef: rule.expectedRuleRef
        }),
        scope: rule.scope,
        contentVersion: task.contentVersion,
        diagnosticTaxonomyVersion,
        classifierVersion
      }));
    }
  }
  return Object.freeze({
    status: records.length ? "CLASSIFIED" : "NO_DIAGNOSTIC",
    answerEventId,
    records: Object.freeze(records),
    diagnosticTaxonomyVersion,
    classifierVersion
  });
}
