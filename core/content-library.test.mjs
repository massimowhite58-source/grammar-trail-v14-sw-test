import test from "node:test";
import assert from "node:assert/strict";
import { validateContentPackage } from "./content-library.mjs";

const complexity = { grammar: "low", lexical: "medium", context: "low" };

function makePackage(overrides = {}) {
  const concepts = [
    { id: "concept-present-simple", version: "1.0.0", title: "Present Simple", definition: "A form used for habits and facts." },
    { id: "concept-third-person", version: "1.0.0", title: "Third-person -s", definition: "Add -s/-es with he, she, or it in affirmative Present Simple." }
  ];
  const contentItems = [{
    id: "theory-present-simple", version: "1.0.0", contentType: "theory",
    title: "Present Simple", body: "Use the Present Simple for habits and facts.",
    conceptRefs: ["concept-present-simple@1.0.0"], learningStages: ["UNDERSTAND"],
    complexity, provenanceId: "prov-original", rightsId: "rights-original",
    qualityReviewId: "review-theory", publicationStatus: "PUBLISHED"
  }];
  const taskDefinitions = [{
    id: "task-def-third-person", targetConceptRefs: ["concept-third-person@1.0.0"],
    taskType: "single_choice", learningObjectives: ["Choose the correct verb form."]
  }];
  const taskVersions = [{
    id: "task-third-person", version: "1.0.0", taskDefinitionId: "task-def-third-person",
    prompt: "Choose the correct sentence.", responseType: "single_choice",
    answerSpec: { options: [{ id: "a", text: "She works." }, { id: "b", text: "She work." }], correctOptionIds: ["a"] },
    conceptRefs: ["concept-third-person@1.0.0"], complexity,
    provenanceId: "prov-original", rightsId: "rights-original",
    qualityReviewId: "review-task", publicationStatus: "PUBLISHED"
  }];
  const qualityReviews = [
    { id: "review-theory", targetRef: "theory-present-simple@1.0.0", rulesVersion: "1", status: "PASS", blockers: [] },
    { id: "review-task", targetRef: "task-third-person@1.0.0", rulesVersion: "1", status: "PASS", blockers: [] }
  ];
  return {
    packageId: "grammar-trail-fixture",
    packageVersion: "1.0.0",
    schemaVersion: 1,
    minEngineVersion: "0.1.0",
    entities: {
      learningUnits: [{
        id: "unit-a1", version: "1.0.0", title: "Present Simple basics", cefrLevel: "A1",
        conceptRefs: ["concept-present-simple@1.0.0", "concept-third-person@1.0.0"],
        contentItemRefs: ["theory-present-simple@1.0.0"],
        taskVersionRefs: ["task-third-person@1.0.0"]
      }],
      concepts,
      contentItems,
      taskDefinitions,
      taskVersions,
      relations: [{ id: "relation-practice", fromRef: "concept-third-person@1.0.0", toRef: "concept-present-simple@1.0.0", type: "practices" }],
      provenanceRecords: [{ id: "prov-original", origin: "Original Grammar Trail authoring", createdBy: "Grammar Trail team" }],
      rightsRecords: [{ id: "rights-original", license: "OWNED_ORIGINAL", status: "CLEARED", attribution: "Grammar Trail" }],
      qualityReviews
    },
    ...overrides
  };
}

test("valid package passes deterministic structural and publication checks", () => {
  const result = validateContentPackage(makePackage());
  assert.equal(result.valid, true, JSON.stringify(result.errors));
  assert.equal(result.publicationEligible, true);
  assert.equal(result.summary.checkedRelations, 1);
});

test("duplicate versioned entity reference is rejected", () => {
  const pkg = makePackage();
  pkg.entities.concepts.push({ ...pkg.entities.concepts[0] });
  const result = validateContentPackage(pkg);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some(error => error.code === "DUPLICATE_ENTITY_VERSION"));
});

test("unresolved versioned references are rejected", () => {
  const pkg = makePackage();
  pkg.entities.learningUnits[0].conceptRefs.push("missing-concept@1.0.0");
  const result = validateContentPackage(pkg);
  assert.ok(result.errors.some(error => error.code === "REFERENCE_NOT_FOUND"));
});

test("invalid choice answer specification blocks publication", () => {
  const pkg = makePackage();
  pkg.entities.taskVersions[0].answerSpec.correctOptionIds = ["not-an-option"];
  const result = validateContentPackage(pkg);
  assert.ok(result.errors.some(error => error.code === "CHOICE_ANSWER_SPEC_INVALID"));
  assert.equal(result.publicationEligible, false);
});

test("uncleared rights block publication", () => {
  const pkg = makePackage();
  pkg.entities.rightsRecords[0].status = "UNCLEAR";
  const result = validateContentPackage(pkg);
  assert.ok(result.errors.some(error => error.code === "RIGHTS_NOT_CLEARED"));
});

test("quality review must match the exact version and rules version", () => {
  const pkg = makePackage();
  pkg.entities.qualityReviews[1].targetRef = "task-third-person@0.9.0";
  const result = validateContentPackage(pkg);
  assert.ok(result.errors.some(error => error.code === "QUALITY_REVIEW_NOT_VALID"));
});

test("directed prerequisite cycle blocks package", () => {
  const pkg = makePackage();
  pkg.entities.relations = [
    { id: "r1", fromRef: "concept-present-simple@1.0.0", toRef: "concept-third-person@1.0.0", type: "requires" },
    { id: "r2", fromRef: "concept-third-person@1.0.0", toRef: "concept-present-simple@1.0.0", type: "requires" }
  ];
  const result = validateContentPackage(pkg);
  assert.ok(result.errors.some(error => error.code === "PREREQUISITE_CYCLE"));
});

test("unsupported schema version is rejected", () => {
  const pkg = makePackage({ schemaVersion: 99 });
  const result = validateContentPackage(pkg);
  assert.ok(result.errors.some(error => error.code === "SCHEMA_VERSION_UNSUPPORTED"));
});

test("validator does not mutate its input", () => {
  const pkg = makePackage();
  const before = JSON.stringify(pkg);
  validateContentPackage(pkg);
  assert.equal(JSON.stringify(pkg), before);
});
