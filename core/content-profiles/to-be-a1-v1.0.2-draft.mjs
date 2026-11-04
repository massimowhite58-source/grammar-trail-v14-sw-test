/**
 * TO BE A1 v1.0.2-draft package profile.
 * Configuration only: the universal adapter owns parsing and validation.
 */
export const TO_BE_A1_V102_PROFILE = Object.freeze({
  profileId: "TO_BE_A1_V102",
  packageId: "TO_BE_A1_FULL_CONTENT_LIBRARY",
  contentVersion: "v1.0.2-draft",
  requiredDocuments: [
    "SET_A_EXERCISES_AND_ANSWER_FEEDBACK.md",
    "SET_B_EXERCISES_AND_ANSWER_FEEDBACK.md",
    "SET_C_EXERCISES_AND_ANSWER_FEEDBACK.md",
    "SET_D_EXERCISES_AND_ANSWER_FEEDBACK.md"
  ],
  expectedExerciseIds: [
    "A1","A2","A3","A4","A5","A6","A7","A8",
    "B1","B2","B3","B4","B5","B6","B7","B8",
    "C1","C2","C3","C4","C5","C6","C7","C8",
    "D1","D2","D3","D4","D5","D6","D7","D8"
  ],
  requiredSections: [
    "learnerPrompt","expectedAnswer","acceptedAlternatives",
    "errorPatterns","feedback","recoveryMapping","skillTags"
  ],
  specialStructures: {
    B1: { requiredTextMarkers: ["Part 1:", "Part 2:"] },
    D3: { requiredTextMarkers: ["D3-01","D3-02","D3-03","D3-04","D3-05"] },
    D8: { requiredHeadings: ["Part 1 — Introduce yourself", "Part 2 — Meet another person"] }
  },
  resolveSetId: exerciseId => exerciseId.slice(0, 1)
});
