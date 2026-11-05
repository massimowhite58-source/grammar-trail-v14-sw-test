/**
 * Grammar Trail Content Library Adapter v0.1
 *
 * Converts an explicitly structured, versioned Content Library package into
 * immutable Core Lab exercise records. It does not scrape Markdown, infer
 * phase mappings, approve draft content, or invent evaluation rules.
 */
export const CONTENT_ADAPTER_VERSION = "0.1.0";
export const TO_BE_A1_SOURCE_DOCUMENTS = Object.freeze([
  "CHANGELOG_v1.0.2.md", "CORE_LAB_HANDOFF.md",
  "DIAGNOSTIC_TAXONOMY_AND_RECOVERY_MAP.md", "EXERCISE_BANK_INDEX.md", "README.md",
  "SET_A_EXERCISES_AND_ANSWER_FEEDBACK.md", "SET_B_EXERCISES_AND_ANSWER_FEEDBACK.md",
  "SET_C_EXERCISES_AND_ANSWER_FEEDBACK.md", "SET_D_EXERCISES_AND_ANSWER_FEEDBACK.md"
]);
export const TO_BE_A1_EXERCISE_IDS = Object.freeze(
  ["A", "B", "C", "D"].flatMap(set => Array.from({ length: 8 }, (_, i) => set + (i + 1)))
);
const RUNTIME_PHASES = new Set(["NEW", "UNDERSTAND", "RECALL", "USE", "MIX", "RECALL_LATER", "STRENGTHEN"]);
const REQUIRED_FIELDS = [
  "exerciseId", "setId", "title", "format", "learnerPrompt", "expectedAnswer",
  "acceptedAlternatives", "errorPatterns", "feedback", "recoveryMapping",
  "skillTags", "source"
];

function isObject(value) { return value !== null && typeof value === "object" && !Array.isArray(value); }
function clone(value) { return JSON.parse(JSON.stringify(value)); }
function deepFreeze(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value)) deepFreeze(child);
  }
  return value;
}
function issue(code, path, detail) { return { code, path, detail }; }

export function validateToBeA1Package({ manifest, exercises, allowedErrorTags }) {
  const issues = [];
  if (!isObject(manifest)) issues.push(issue("MANIFEST_REQUIRED", "manifest", "A package manifest is required."));
  if (!manifest || manifest.packageId !== "TO_BE_A1_FULL_CONTENT_LIBRARY") {
    issues.push(issue("PACKAGE_ID_MISMATCH", "manifest.packageId", "Expected TO_BE_A1_FULL_CONTENT_LIBRARY."));
  }
  if (!manifest || manifest.contentVersion !== "v1.0.2-draft") {
    issues.push(issue("CONTENT_VERSION_MISMATCH", "manifest.contentVersion", "Expected v1.0.2-draft."));
  }
  const actualSourceNames = Array.isArray(manifest?.sourceDocuments)
    ? manifest.sourceDocuments.map(item => typeof item === "string" ? item : item?.path).sort()
    : [];
  const expectedSourceNames = [...TO_BE_A1_SOURCE_DOCUMENTS].sort();
  if (JSON.stringify(actualSourceNames) !== JSON.stringify(expectedSourceNames)) {
    issues.push(issue("SOURCE_DOCUMENTS_INCOMPLETE", "manifest.sourceDocuments", "Expected the exact nine source document names from the v1.0.2 package."));
  }
  if (!Array.isArray(allowedErrorTags) || allowedErrorTags.length === 0) {
    issues.push(issue("ERROR_TAXONOMY_REQUIRED", "allowedErrorTags", "Supply the canonical concrete Error Tag allowlist."));
  }
  if (!Array.isArray(exercises)) {
    issues.push(issue("EXERCISE_ARRAY_REQUIRED", "exercises", "Exercises must be an array."));
    return deepFreeze({ status: "REJECTED", adapterVersion: CONTENT_ADAPTER_VERSION, issues });
  }

  const byId = new Map();
  exercises.forEach((exercise, index) => {
    const path = `exercises[${index}]`;
    if (!isObject(exercise)) {
      issues.push(issue("EXERCISE_INVALID", path, "Exercise record must be an object."));
      return;
    }
    for (const field of REQUIRED_FIELDS) {
      if (!(field in exercise)) issues.push(issue("EXERCISE_FIELD_MISSING", `${path}.${field}`, `Required field ${field} is missing.`));
    }
    if (typeof exercise.exerciseId !== "string") return;
    if (byId.has(exercise.exerciseId)) issues.push(issue("DUPLICATE_EXERCISE_ID", `${path}.exerciseId`, exercise.exerciseId));
    else byId.set(exercise.exerciseId, exercise);
    if (!["A", "B", "C", "D"].includes(exercise.setId)) {
      issues.push(issue("SET_ID_INVALID", `${path}.setId`, "setId must be A, B, C or D."));
    } else if (!exercise.exerciseId.startsWith(exercise.setId)) {
      issues.push(issue("SET_ID_MISMATCH", `${path}.setId`, "Exercise ID prefix must match setId."));
    }
    for (const field of ["title", "format", "learnerPrompt", "expectedAnswer", "feedback"]) {
      if (typeof exercise[field] !== "string" || !exercise[field].trim()) {
        issues.push(issue("EXERCISE_TEXT_EMPTY", `${path}.${field}`, `${field} must be a non-empty string.`));
      }
    }
    for (const field of ["acceptedAlternatives", "errorPatterns", "recoveryMapping", "skillTags"]) {
      if (!Array.isArray(exercise[field])) {
        issues.push(issue("EXERCISE_LIST_INVALID", `${path}.${field}`, `${field} must be an array.`));
      }
    }
    if (!isObject(exercise.source) || typeof exercise.source.documentPath !== "string" ||
        typeof exercise.source.heading !== "string") {
      issues.push(issue("SOURCE_PROVENANCE_MISSING", `${path}.source`, "Each exercise needs source document path and heading."));
    } else {
      const expectedDocument = `SET_${exercise.setId}_EXERCISES_AND_ANSWER_FEEDBACK.md`;
      if (exercise.source.documentPath !== expectedDocument || !exercise.source.heading.startsWith(exercise.exerciseId + " —")) {
        issues.push(issue("SOURCE_PROVENANCE_MISMATCH", `${path}.source`, "Source document and heading must identify this exercise in its set file."));
      }
    }
    if (Array.isArray(exercise.errorPatterns) && Array.isArray(allowedErrorTags)) {
      exercise.errorPatterns.forEach((tag, tagIndex) => {
        if (typeof tag !== "string" || !allowedErrorTags.includes(tag)) {
          issues.push(issue("ERROR_TAG_NOT_CANONICAL", `${path}.errorPatterns[${tagIndex}]`, String(tag)));
        }
      });
    }
    if (exercise.evaluation !== undefined && !isObject(exercise.evaluation)) {
      issues.push(issue("EVALUATION_DESCRIPTOR_INVALID", `${path}.evaluation`, "evaluation must be a normalized descriptor object."));
    }
  });

  for (const id of TO_BE_A1_EXERCISE_IDS) {
    if (!byId.has(id)) issues.push(issue("EXERCISE_MISSING", "exercises", id));
  }
  for (const id of byId.keys()) {
    if (!TO_BE_A1_EXERCISE_IDS.includes(id)) issues.push(issue("EXERCISE_ID_UNEXPECTED", "exercises", id));
  }
  if (exercises.length !== 32) issues.push(issue("EXERCISE_COUNT_MISMATCH", "exercises", `Expected 32, received ${exercises.length}.`));

  const b1 = byId.get("B1");
  if (b1 && (!Array.isArray(b1.parts) || b1.parts.length !== 2)) {
    issues.push(issue("B1_PART_STRUCTURE_INVALID", "exercises[B1].parts", "B1 must remain one exercise with exactly two independently assessable parts."));
  }
  const d3 = byId.get("D3");
  if (d3) {
    const expected = ["D3-01", "D3-02", "D3-03", "D3-04", "D3-05"];
    const actual = Array.isArray(d3.diagnosticSubrecords) ? d3.diagnosticSubrecords.map(x => x?.diagnosticId) : [];
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
      issues.push(issue("D3_DIAGNOSTIC_STRUCTURE_INVALID", "exercises[D3].diagnosticSubrecords", "D3 must contain D3-01 through D3-05 in order, within one exercise."));
    }
  }
  if (issues.length) return deepFreeze({ status: "REJECTED", adapterVersion: CONTENT_ADAPTER_VERSION, issues });

  const ordered = TO_BE_A1_EXERCISE_IDS.map(id => clone(byId.get(id)));
  return deepFreeze({
    status: "VALIDATED_FOR_CORE_LAB",
    adapterVersion: CONTENT_ADAPTER_VERSION,
    package: {
      packageId: manifest.packageId,
      contentVersion: manifest.contentVersion,
      packageStatus: manifest.packageStatus ?? "DRAFT",
      sourceDocuments: clone(manifest.sourceDocuments),
      taxonomyVersion: manifest.taxonomyVersion ?? null,
      exerciseCount: ordered.length,
      exercises: ordered
    },
    notices: [
      "Core Lab validation is not learner approval.",
      "No learning phase has been inferred.",
      "Exercises without explicit evaluation descriptors are not automatically evaluated."
    ]
  });
}

/**
 * Explicitly maps a validated draft record to the existing Content Runtime task
 * contract. Delivery remains blocked unless the caller supplies a phase and
 * approved state; this adapter never promotes draft content.
 */
export function toRuntimeTask({ validatedPackage, exerciseId, knowledgeItemId, hypothesisId, phase, approvalState }) {
  if (validatedPackage?.status !== "VALIDATED_FOR_CORE_LAB") {
    return deepFreeze({ status: "REJECTED", code: "PACKAGE_NOT_VALIDATED" });
  }
  const exercise = validatedPackage.package.exercises.find(item => item.exerciseId === exerciseId);
  if (!exercise) return deepFreeze({ status: "REJECTED", code: "EXERCISE_NOT_FOUND" });
  if (!knowledgeItemId || !hypothesisId) return deepFreeze({ status: "REJECTED", code: "LEARNING_TARGET_REQUIRED" });
  if (!RUNTIME_PHASES.has(phase)) return deepFreeze({ status: "REJECTED", code: "EXPLICIT_PHASE_MAPPING_REQUIRED" });
  if (!["APPROVED", "ACTIVE"].includes(approvalState)) {
    return deepFreeze({ status: "REJECTED", code: "CONTENT_NOT_LEARNER_APPROVED" });
  }
  if (!exercise.evaluation) return deepFreeze({ status: "REJECTED", code: "EVALUATION_DESCRIPTOR_REQUIRED" });
  return deepFreeze({
    status: "READY",
    task: {
      taskId: exercise.exerciseId,
      knowledgeItemId,
      hypothesisId,
      phase,
      contentVersion: validatedPackage.package.contentVersion,
      approvalState,
      payload: { prompt: exercise.learnerPrompt },
      evaluation: clone(exercise.evaluation),
      source: clone(exercise.source),
      sourcePackageId: validatedPackage.package.packageId
    }
  });
}
