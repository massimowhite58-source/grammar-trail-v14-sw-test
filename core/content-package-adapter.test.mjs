import test from "node:test";
import assert from "node:assert/strict";
import { parseMarkdownExerciseDocument, ingestMarkdownContentPackage, attachRuntimeMapping } from "./content-package-adapter.mjs";

const docA = [
"# Set One", "",
"## X1 — Choose a form", "",
"**Learner prompt**", "", "Choose one: __.", "",
"**Expected answer**", "", "am", "",
"**Accepted alternatives**", "", "Accept AM.", "",
"**Error patterns**", "", "FORM_X", "",
"**Feedback**", "", "Check the subject.", "",
"**Recovery mapping**", "", "Try a new subject.", "",
"**Skill tags**", "", "RECALL", "",
"**Editorial note**", "", "Keep this note.", "",
"## X2 — Open response", "",
"**Learner prompt**", "", "Write two sentences.", "",
"**Part 1 — Introduce yourself**", "", "Say your name.", "",
"**Part 2 — Ask a question**", "", "Ask the other person.", "",
"**Expected answer**", "", "Responses vary.", "",
"**Accepted alternatives**", "", "See rubric.", "",
"**Error patterns**", "", "REVIEW_REQUIRED", "",
"**Feedback**", "", "Use the target form.", "",
"**Recovery mapping**", "", "Review the model.", "",
"**Skill tags**", "", "COMMUNICATION"
].join("\n");
const docB = [
"# Set Two", "", "## Y1 — Multi-part", "",
"**Learner prompt**", "", "Complete both parts.", "",
"**Expected answer**", "", "Part 1: A; Part 2: B.", "",
"**Accepted alternatives**", "", "Part 1: A1. Part 2: B1.", "",
"**Error patterns**", "", "E1; E2", "",
"**Feedback**", "", "Check each part.", "",
"**Recovery mapping**", "", "Retry the missed part.", "",
"**Skill tags**", "", "RECALL; USE"
].join("\n");
const profile = {
  requiredDocuments: ["set-one.md", "set-two.md"],
  expectedExerciseIds: ["X1", "X2", "Y1"],
  requiredSections: ["learnerPrompt", "expectedAnswer", "acceptedAlternatives", "errorPatterns", "feedback", "recoveryMapping", "skillTags"],
  specialStructures: { X2: { requiredHeadings: ["Part 1 — Introduce yourself", "Part 2 — Ask a question"] } }
};
const manifest = { packageId: "SAMPLE", contentVersion: "1.0-draft", packageStatus: "DRAFT" };
const docs = () => [{ documentPath: "set-one.md", markdown: docA }, { documentPath: "set-two.md", markdown: docB }];
const ingest = () => ingestMarkdownContentPackage({ manifest, documents: docs(), profile });

test("parses exercise headings and preserves original section bodies", () => {
  const result = parseMarkdownExerciseDocument({ documentPath: "set-one.md", markdown: docA });
  assert.equal(result.status, "PARSED");
  assert.equal(result.exerciseCount, 2);
  const x2 = result.exercises.find(x => x.exerciseId === "X2");
  assert.equal(x2.sections["Part 1 — Introduce yourself"], "Say your name.");
  assert.equal(x2.sections["Part 2 — Ask a question"], "Ask the other person.");
  assert.match(x2.sourceBody, /Responses vary\./);
});
test("ingests different content families through configuration only", () => {
  const result = ingest();
  assert.equal(result.status, "INGESTED_DRAFT");
  assert.equal(result.package.exerciseCount, 3);
  assert.equal(result.package.exercises.find(x => x.exerciseId === "X1").authored.expectedAnswer, "am");
  assert.equal(result.package.exercises.find(x => x.exerciseId === "X1").mappingStatus, "SOURCE_PARSED_REQUIRES_SEMANTIC_MAPPING");
});
test("rejects missing source documents and expected exercise IDs", () => {
  const result = ingestMarkdownContentPackage({ manifest, documents: [docs()[0]], profile });
  assert.equal(result.status, "REJECTED");
  assert.ok(result.issues.some(x => x.code === "SOURCE_DOCUMENT_MISSING"));
  assert.ok(result.issues.some(x => x.code === "EXERCISE_MISSING" && x.exerciseId === "Y1"));
});
test("rejects duplicate exercise IDs across source documents", () => {
  const duplicateDoc = docA.replace("X1", "X3").replace("X2", "X1");
  const result = ingestMarkdownContentPackage({
    manifest, documents: [{ documentPath: "set-one.md", markdown: docA }, { documentPath: "set-two.md", markdown: duplicateDoc }],
    profile: { requiredDocuments: [], expectedExerciseIds: [] }
  });
  assert.ok(result.issues.some(x => x.code === "DUPLICATE_EXERCISE_ID"));
});
test("preserves package-specific headings and optional editorial sections", () => {
  const result = ingest();
  const x2 = result.package.exercises.find(x => x.exerciseId === "X2");
  assert.equal(x2.sections["Part 1 — Introduce yourself"], "Say your name.");
  assert.equal(result.package.exercises.find(x => x.exerciseId === "X1").authored.editorialNote, "Keep this note.");
});
test("never infers evaluation, diagnostics, phase, approval or delivery readiness", () => {
  const result = ingest();
  assert.equal(result.package.packageStatus, "DRAFT");
  assert.equal(attachRuntimeMapping({ ingestedPackage: result, exerciseId: "X1", mapping: {} }).status, "REVIEW_REQUIRED");
});
test("requires explicit evaluation and hypothesis before adding runtime mapping", () => {
  const result = ingest();
  const mapped = attachRuntimeMapping({
    ingestedPackage: result, exerciseId: "X1",
    mapping: { hypothesisId: "hyp-x1", evaluation: { mode: "CHOICE", parts: [] } }
  });
  assert.equal(mapped.status, "MAPPED_DRAFT");
  assert.deepEqual(mapped.mapping.phaseMappings, []);
});
test("output is immutable and source Markdown is not mutated", () => {
  const before = docA;
  const result = ingest();
  assert.equal(docA, before);
  assert.ok(Object.isFrozen(result.package.exercises[0]));
  assert.ok(Object.isFrozen(result.package.exercises[0].sections));
});
