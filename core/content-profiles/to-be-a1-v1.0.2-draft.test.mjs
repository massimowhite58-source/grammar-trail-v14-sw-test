import test from "node:test";
import assert from "node:assert/strict";
import { TO_BE_A1_V102_PROFILE as profile } from "./to-be-a1-v1.0.2-draft.mjs";

test("TO BE A1 profile declares all 32 stable exercise IDs exactly once", () => {
  assert.equal(profile.expectedExerciseIds.length, 32);
  assert.equal(new Set(profile.expectedExerciseIds).size, 32);
  assert.deepEqual(profile.expectedExerciseIds.slice(0, 8), ["A1","A2","A3","A4","A5","A6","A7","A8"]);
  assert.deepEqual(profile.expectedExerciseIds.slice(8, 16), ["B1","B2","B3","B4","B5","B6","B7","B8"]);
});
test("TO BE A1 profile declares all four exercise source documents", () => {
  assert.equal(profile.requiredDocuments.length, 4);
  assert.ok(profile.requiredDocuments.every(path => path.startsWith("SET_") && path.endsWith("_EXERCISES_AND_ANSWER_FEEDBACK.md")));
});
test("B1, D3 and D8 exceptions are explicit profile data", () => {
  assert.deepEqual(profile.specialStructures.B1.requiredTextMarkers, ["Part 1:", "Part 2:"]);
  assert.deepEqual(profile.specialStructures.D3.requiredTextMarkers, ["D3-01","D3-02","D3-03","D3-04","D3-05"]);
  assert.deepEqual(profile.specialStructures.D8.requiredHeadings, ["Part 1 — Introduce yourself", "Part 2 — Meet another person"]);
});
test("profile resolves the exercise family without embedding parser behavior", () => {
  assert.equal(profile.resolveSetId("A4"), "A");
  assert.equal(profile.resolveSetId("D8"), "D");
});
