/**
 * Grammar Trail Diagnostic Classifier v0.1
 * Maps evaluator outcomes to explicit authored diagnostic rules only.
 * No free-form inference, taxonomy guessing, or history mutation.
 */
export const DIAGNOSTIC_CLASSIFIER_VERSION = "0.1.0";

const RESERVED_NON_ERROR_TAGS = new Set([
  "GRAMMAR_ACCURACY", "COMMUNICATION_COMPLETION", "CONTEXT_TRANSFER", "MIXED_FORM_SELECTION"
]);
function readPath(value, path) {
  if (!path) return undefined;
  return path.split(".").reduce((current, key) => current == null ? undefined : current[key], value);
}
function responsePathValue(response, path) {
  return readPath(response, path);
}

export function classifyDiagnostics({
  task, rawResponse, evaluation, answerEventId,
  diagnosticTaxonomyVersion, allowedErrorTags, classifierVersion = DIAGNOSTIC_CLASSIFIER_VERSION
}) {
  if (!answerEventId || typeof answerEventId !== "string") {
    return Object.freeze({ status: "REVIEW_REQUIRED", answerEventId: null, records: Object.freeze([]), reason: "ANSWER_EVENT_ID_REQUIRED" });
  }
  if (!task?.evaluation || !evaluation || evaluation.status !== "EVALUATED" || !Array.isArray(evaluation.parts)) {
    return Object.freeze({ status: "REVIEW_REQUIRED", answerEventId, records: Object.freeze([]), reason: "VALID_EVALUATION_REQUIRED" });
  }
  if (!diagnosticTaxonomyVersion || typeof diagnosticTaxonomyVersion !== "string" || !Array.isArray(allowedErrorTags) || allowedErrorTags.length === 0) {
    return Object.freeze({ status: "REVIEW_REQUIRED", answerEventId, records: Object.freeze([]), reason: "TAXONOMY_VERSION_AND_ALLOWED_TAGS_REQUIRED" });
  }

  const records = [];
  const seen = new Set();
  for (const partResult of evaluation.parts) {
    if (partResult.outcome !== "INCORRECT") continue;
    const descriptorPart = task.evaluation.parts.find(part => part.partId === partResult.partId);
    if (!descriptorPart || !Array.isArray(descriptorPart.diagnostics)) {
      return Object.freeze({ status: "REVIEW_REQUIRED", answerEventId, records: Object.freeze([]), reason: "AUTHORED_DIAGNOSTIC_RULES_MISSING" });
    }
    for (const rule of descriptorPart.diagnostics) {
      if (!rule || typeof rule.errorTag !== "string" || !rule.errorTag.trim() ||
          typeof rule.expectedRuleRef !== "string" || !rule.expectedRuleRef.trim() ||
          typeof rule.responsePath !== "string" || !rule.responsePath.trim() ||
          !["TARGET_HYPOTHESIS", "OUTSIDE_TARGET", "INSTRUCTION", "COMMUNICATION"].includes(rule.scope)) {
        return Object.freeze({ status: "REVIEW_REQUIRED", answerEventId, records: Object.freeze([]), reason: "AUTHORED_DIAGNOSTIC_RULE_INVALID" });
      }
      if (RESERVED_NON_ERROR_TAGS.has(rule.errorTag) || !allowedErrorTags.includes(rule.errorTag)) {
        return Object.freeze({ status: "REVIEW_REQUIRED", answerEventId, records: Object.freeze([]), reason: "NON_DIAGNOSTIC_TAG_USED_AS_ERROR" });
      }
      const diagnosticId = rule.diagnosticId ?? `${task.taskId}:${partResult.partId}:${rule.errorTag}`;
      if (seen.has(diagnosticId)) {
        return Object.freeze({ status: "REVIEW_REQUIRED", answerEventId, records: Object.freeze([]), reason: "DUPLICATE_DIAGNOSTIC_ID" });
      }
      seen.add(diagnosticId);
      records.push(Object.freeze({
        diagnosticId,
        answerEventId,
        partId: partResult.partId,
        errorTag: rule.errorTag,
        evidence: Object.freeze({
          responsePath: rule.responsePath,
          observedValue: responsePathValue(rawResponse, rule.responsePath),
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
