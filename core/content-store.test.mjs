import test from "node:test";
import assert from "node:assert/strict";
import { createContentStore } from "./content-store.mjs";

const complexity = { grammar: "low", lexical: "medium", context: "low" };

function validPackage(overrides = {}) {
  const concepts = [{
    id: "concept-a", version: "1.0.0", title: "Present Simple",
    definition: "Used for habits and facts."
  }];
  return {
    packageId: "fixture",
    packageVersion: "1.0.0",
    schemaVersion: 1,
    minEngineVersion: "0.1.0",
    entities: {
      learningUnits: [{
        id: "unit-a", version: "1.0.0", title: "Unit A", cefrLevel: "A1",
        conceptRefs: ["concept-a@1.0.0"],
        contentItemRefs: ["theory-a@1.0.0"],
        taskVersionRefs: ["task-a@1.0.0"]
      }],
      concepts,
      contentItems: [{
        id: "theory-a", version: "1.0.0", contentType: "theory",
        title: "Theory", body: "Original explanation.",
        conceptRefs: ["concept-a@1.0.0"], complexity,
        provenanceId: "prov-a", rightsId: "rights-a", qualityReviewId: "review-theory",
        publicationStatus: "PUBLISHED"
      }],
      taskDefinitions: [{
        id: "task-def-a", targetConceptRefs: ["concept-a@1.0.0"],
        taskType: "single_choice", learningObjectives: ["Choose a correct form."]
      }],
      taskVersions: [{
        id: "task-a", version: "1.0.0", taskDefinitionId: "task-def-a",
        prompt: "Choose the correct sentence.", responseType: "single_choice",
        answerSpec: {
          options: [{ id: "yes", text: "She works." }, { id: "no", text: "She work." }],
          correctOptionIds: ["yes"]
        },
        conceptRefs: ["concept-a@1.0.0"], complexity,
        provenanceId: "prov-a", rightsId: "rights-a", qualityReviewId: "review-task",
        publicationStatus: "PUBLISHED"
      }],
      relations: [],
      provenanceRecords: [{ id: "prov-a", origin: "Original Grammar Trail content", createdBy: "Grammar Trail" }],
      rightsRecords: [{ id: "rights-a", license: "OWNED_ORIGINAL", status: "CLEARED" }],
      qualityReviews: [
        { id: "review-theory", targetRef: "theory-a@1.0.0", rulesVersion: "1", status: "PASS", blockers: [] },
        { id: "review-task", targetRef: "task-a@1.0.0", rulesVersion: "1", status: "PASS", blockers: [] }
      ]
    },
    ...overrides
  };
}

function memoryAdapter({ failWrites = false } = {}) {
  const packages = new Map();
  let activeRef = null;
  return {
    packages,
    getPackage: async (key) => packages.has(key) ? structuredClone(packages.get(key)) : null,
    getActivePackageRef: async () => activeRef,
    putPackageAndActivate: async (key, pkg) => {
      if (failWrites) {
        const error = new Error("Simulated quota exceeded.");
        error.code = "QUOTA_EXCEEDED";
        throw error;
      }
      const existing = packages.get(key);
      if (existing && JSON.stringify(existing) !== JSON.stringify(pkg)) {
        const error = new Error("Published package versions are immutable.");
        error.code = "VERSION_IMMUTABLE_CONFLICT";
        throw error;
      }
      packages.set(key, structuredClone(pkg));
      activeRef = key;
    }
  };
}

test("valid package installs and becomes active only after adapter verification", async () => {
  const adapter = memoryAdapter();
  const store = createContentStore({ adapter });
  const result = await store.installPackage(validPackage());
  assert.equal(result.status, "ACTIVATED");
  const active = await store.getActivePackage();
  assert.equal(active.status, "FOUND");
  assert.equal(active.packageRef, "fixture@1.0.0");
});

test("invalid package is rejected without touching the active package", async () => {
  const adapter = memoryAdapter();
  const store = createContentStore({ adapter });
  assert.equal((await store.installPackage(validPackage())).status, "ACTIVATED");
  const invalid = validPackage({ packageVersion: "1.1.0" });
  invalid.entities.taskVersions[0].answerSpec.correctOptionIds = ["missing"];
  const result = await store.installPackage(invalid);
  assert.equal(result.status, "INVALID_PACKAGE");
  assert.equal((await store.getActivePackage()).packageRef, "fixture@1.0.0");
});

test("incompatible package is rejected before storage", async () => {
  const adapter = memoryAdapter();
  const store = createContentStore({ adapter, engineVersion: "0.1.0" });
  const pkg = validPackage({ packageVersion: "2.0.0", minEngineVersion: "1.0.0" });
  const result = await store.installPackage(pkg);
  assert.equal(result.status, "ENGINE_INCOMPATIBLE");
  assert.equal(adapter.packages.size, 0);
});

test("a published version cannot be silently replaced with different content", async () => {
  const adapter = memoryAdapter();
  const store = createContentStore({ adapter });
  assert.equal((await store.installPackage(validPackage())).status, "ACTIVATED");
  const changed = validPackage();
  changed.entities.contentItems[0].body = "Changed without a new version.";
  const result = await store.installPackage(changed);
  assert.equal(result.status, "VERSION_IMMUTABLE_CONFLICT");
  assert.equal((await store.getActivePackage()).package.entities.contentItems[0].body, "Original explanation.");
});

test("storage failure is explicit and does not imply success", async () => {
  const store = createContentStore({ adapter: memoryAdapter({ failWrites: true }) });
  const result = await store.installPackage(validPackage());
  assert.equal(result.status, "QUOTA_EXCEEDED");
  assert.notEqual(result.status, "ACTIVATED");
});

test("missing package returns an explicit status", async () => {
  const store = createContentStore({ adapter: memoryAdapter() });
  const result = await store.getPackage("missing", "1.0.0");
  assert.equal(result.status, "NOT_FOUND");
  assert.equal(result.package, null);
});
