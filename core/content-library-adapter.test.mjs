import test from "node:test";
import assert from "node:assert/strict";
import { validateToBeA1Package, toRuntimeTask, TO_BE_A1_EXERCISE_IDS } from "./content-library-adapter.mjs";

const allowedErrorTags = [
  "FORM_AM","FORM_IS","FORM_ARE","FORM_SELECTION","SUBJECT_MAPPING","WORD_ORDER",
  "NEGATION_PLACEMENT","NEGATIVE_CONSTRUCTION","NEGATIVE_FORM_ARE","NEGATIVE_CONTRACTION",
  "QUESTION_CONSTRUCTION","AUXILIARY_SELECTION","QUESTION_WORD_ORDER","WH_QUESTION_STRUCTURE",
  "QUESTION_AUXILIARY_IS","SHORT_ANSWER_FORM","ANSWER_SUBJECT_MAPPING","QUESTION_MEANING",
  "CONTEXT_UNDERSTANDING","CONTEXT_ACCURACY","BE_VERB_CONFUSION","AFFIRMATIVE_CONSTRUCTION",
  "INDEPENDENT_PRODUCTION","COMMUNICATION_COMPLETION","ARTICLE_USAGE","INSTRUCTION_FOLLOWING",
  "DIALOGUE_CONSTRUCTION"
];
const manifest = {
  packageId: "TO_BE_A1_FULL_CONTENT_LIBRARY",
  contentVersion: "v1.0.2-draft",
  packageStatus: "DRAFT",
  taxonomyVersion: "to-be-a1-taxonomy-v1",
  sourceDocuments: Array.from({ length: 9 }, (_, i) => ({ path: `source-${i + 1}.md` }))
};
function exercise(id) {
  const setId = id[0];
  const base = {
    exerciseId: id, setId, title: `Exercise ${id}`, format: "TEST_FIXTURE",
    learnerPrompt: `Prompt ${id}`, expectedAnswer: `Answer ${id}`,
    acceptedAlternatives: [], errorPatterns: ["FORM_IS"], feedback: "Check the subject.",
    recoveryMapping: [], skillTags: ["RECALL"],
    source: { documentPath: `SET_${setId}_EXERCISES_AND_ANSWER_FEEDBACK.md`, heading: id }
  };
  if (id === "B1") base.parts = [{ partId: "B1-1" }, { partId: "B1-2" }];
  if (id === "D3") base.diagnosticSubrecords = ["D3-01","D3-02","D3-03","D3-04","D3-05"].map(diagnosticId => ({ diagnosticId }));
  return base;
}
const exercises = () => TO_BE_A1_EXERCISE_IDS.map(exercise);
const validate = (items = exercises(), m = manifest) => validateToBeA1Package({ manifest: m, exercises: items, allowedErrorTags });

test("validates exact 32-exercise inventory in canonical A-D order", () => {
  const result = validate();
  assert.equal(result.status, "VALIDATED_FOR_CORE_LAB");
  assert.equal(result.package.exerciseCount, 32);
  assert.deepEqual(result.package.exercises.map(x => x.exerciseId), TO_BE_A1_EXERCISE_IDS);
});
test("keeps B1 as one exercise with exactly two parts", () => {
  const result = validate();
  assert.equal(result.package.exercises.filter(x => x.exerciseId === "B1").length, 1);
  assert.equal(result.package.exercises.find(x => x.exerciseId === "B1").parts.length, 2);
});
test("keeps D3 as one exercise with five separately identified diagnostic subrecords", () => {
  const result = validate();
  const d3 = result.package.exercises.filter(x => x.exerciseId === "D3");
  assert.equal(d3.length, 1);
  assert.deepEqual(d3[0].diagnosticSubrecords.map(x => x.diagnosticId), ["D3-01","D3-02","D3-03","D3-04","D3-05"]);
});
test("rejects missing exercise IDs", () => {
  const result = validate(exercises().filter(x => x.exerciseId !== "C4"));
  assert.equal(result.status, "REJECTED");
  assert.ok(result.issues.some(x => x.code === "EXERCISE_MISSING" && x.detail === "C4"));
});
test("rejects duplicate and unexpected exercise IDs", () => {
  const items = exercises();
  items.push(exercise("A1"));
  items.push(exercise("X1"));
  const result = validate(items);
  assert.ok(result.issues.some(x => x.code === "DUPLICATE_EXERCISE_ID"));
  assert.ok(result.issues.some(x => x.code === "EXERCISE_ID_UNEXPECTED"));
});
test("rejects malformed B1 or D3 internal structure", () => {
  const items = exercises();
  items.find(x => x.exerciseId === "B1").parts.pop();
  items.find(x => x.exerciseId === "D3").diagnosticSubrecords.pop();
  const result = validate(items);
  assert.ok(result.issues.some(x => x.code === "B1_PART_STRUCTURE_INVALID"));
  assert.ok(result.issues.some(x => x.code === "D3_DIAGNOSTIC_STRUCTURE_INVALID"));
});
test("rejects non-canonical error tags", () => {
  const items = exercises();
  items.find(x => x.exerciseId === "A1").errorPatterns.push("GRAMMAR_ACCURACY");
  const result = validate(items);
  assert.ok(result.issues.some(x => x.code === "ERROR_TAG_NOT_CANONICAL"));
});
test("requires complete source provenance and all nine source documents", () => {
  const items = exercises();
  delete items[0].source.documentPath;
  const result = validate(items, { ...manifest, sourceDocuments: manifest.sourceDocuments.slice(0, 8) });
  assert.ok(result.issues.some(x => x.code === "SOURCE_PROVENANCE_MISSING"));
  assert.ok(result.issues.some(x => x.code === "SOURCE_DOCUMENTS_INCOMPLETE"));
});
test("never invents phase mapping or promotes draft content for learner delivery", () => {
  const pkg = validate();
  const noPhase = toRuntimeTask({ validatedPackage: pkg, exerciseId: "A1", knowledgeItemId: "ki-to-be-a1", hypothesisId: "hyp-to-be-a1", approvalState: "APPROVED" });
  assert.equal(noPhase.code, "EXPLICIT_PHASE_MAPPING_REQUIRED");
  const draft = toRuntimeTask({ validatedPackage: pkg, exerciseId: "A1", knowledgeItemId: "ki-to-be-a1", hypothesisId: "hyp-to-be-a1", phase: "NEW", approvalState: "DRAFT" });
  assert.equal(draft.code, "CONTENT_NOT_LEARNER_APPROVED");
});
test("requires an explicit evaluation descriptor before runtime delivery", () => {
  const pkg = validate();
  const result = toRuntimeTask({ validatedPackage: pkg, exerciseId: "A1", knowledgeItemId: "ki-to-be-a1", hypothesisId: "hyp-to-be-a1", phase: "NEW", approvalState: "APPROVED" });
  assert.equal(result.code, "EVALUATION_DESCRIPTOR_REQUIRED");
});
test("maps an explicitly approved, evaluated exercise to existing task contract", () => {
  const items = exercises();
  items[0].evaluation = { mode: "BLANKS", ruleVersion: "A1-r1", parts: [{ partId: "answer", accepted: [{ value: "am" }] }] };
  const pkg = validate(items);
  const result = toRuntimeTask({ validatedPackage: pkg, exerciseId: "A1", knowledgeItemId: "ki-to-be-a1", hypothesisId: "hyp-to-be-a1", phase: "UNDERSTAND", approvalState: "APPROVED" });
  assert.equal(result.status, "READY");
  assert.equal(result.task.taskId, "A1");
  assert.equal(result.task.evaluation.parts[0].accepted[0].value, "am");
});
test("returns a deeply immutable validated package without mutating input records", () => {
  const items = exercises();
  const before = JSON.stringify(items);
  const result = validate(items);
  assert.equal(JSON.stringify(items), before);
  assert.ok(Object.isFrozen(result.package.exercises[0]));
  assert.ok(Object.isFrozen(result.package.exercises[0].source));
});
