import test from "node:test";
import assert from "node:assert/strict";
import { evaluateAnswer } from "./answer-evaluator.mjs";
import { classifyDiagnostics } from "./diagnostic-classifier.mjs";

const makePart = (partId, value, extra = {}) => ({
  partId, responsePath: partId,
  accepted: [{ alternativeId: partId + "-expected", value }],
  diagnostics: [],
  ...extra
});
const task = (taskId, mode, parts) => ({
  taskId, contentVersion: "v1.0.2-draft",
  evaluation: { mode, ruleVersion: "TO_BE_A1_SET_A_v0.1-draft", parts }
});

test("A1 accepts case and punctuation differences explicitly allowed by source", () => {
  const t = task("A1", "BLANKS", [
    makePart("blank_1", "am", { normalization: { caseInsensitive: true, ignorePunctuation: true } }),
    makePart("blank_2", "is", { normalization: { caseInsensitive: true, ignorePunctuation: true } }),
    makePart("blank_3", "are", { normalization: { caseInsensitive: true, ignorePunctuation: true } }),
    makePart("blank_4", "are", { normalization: { caseInsensitive: true, ignorePunctuation: true } }),
    makePart("blank_5", "is", { normalization: { caseInsensitive: true, ignorePunctuation: true } })
  ]);
  const a = evaluateAnswer({ task: t, response: {
    blank_1: "AM,", blank_2: "IS.", blank_3: "Are!", blank_4: "are?", blank_5: "is;"
  }});
  assert.equal(a.outcome, "CORRECT");
});

test("A1 still rejects a wrong form after allowed normalization", () => {
  const t = task("A1", "BLANKS", [
    makePart("blank_1", "am", { normalization: { caseInsensitive: true, ignorePunctuation: true } })
  ]);
  assert.equal(evaluateAnswer({ task: t, response: { blank_1: "is" } }).outcome, "INCORRECT");
});

test("A3 evaluates only the be-form blank; spelling outside the blank is not part of response", () => {
  const t = task("A3", "BLANKS", [
    makePart("blank_1", "am"), makePart("blank_2", "is"),
    makePart("blank_3", "are"), makePart("blank_4", "is"),
    makePart("blank_5", "are"), makePart("blank_6", "are")
  ]);
  const a = evaluateAnswer({ task: t, response: {
    blank_1: "am", blank_2: "is", blank_3: "are",
    blank_4: "is", blank_5: "are", blank_6: "are",
    unrelatedSentenceSpelling: "Germny"
  }});
  assert.equal(a.outcome, "CORRECT");
});

test("A4 accepts capitalization and punctuation differences, but not a different be-form", () => {
  const t = task("A4", "MULTI_PART", [
    makePart("sentence_1", "I am Alex.", { normalization: { caseInsensitive: true, ignorePunctuation: true } }),
    makePart("sentence_2", "She is a student.", { normalization: { caseInsensitive: true, ignorePunctuation: true } }),
    makePart("sentence_3", "They are from Spain.", { normalization: { caseInsensitive: true, ignorePunctuation: true } }),
    makePart("sentence_4", "We are friends.", { normalization: { caseInsensitive: true, ignorePunctuation: true } })
  ]);
  const good = evaluateAnswer({ task: t, response: {
    sentence_1: "i AM alex", sentence_2: "SHE IS A STUDENT!",
    sentence_3: "they are from spain", sentence_4: "WE ARE FRIENDS?"
  }});
  assert.equal(good.outcome, "CORRECT");
  const bad = evaluateAnswer({ task: t, response: {
    sentence_1: "I is Alex.", sentence_2: "She is a student.",
    sentence_3: "They are from Spain.", sentence_4: "We are friends."
  }});
  assert.equal(bad.parts[0].outcome, "INCORRECT");
});

test("A6 accepts harmless punctuation/capitalization changes but preserves word order and agreement", () => {
  const t = task("A6", "MULTI_PART", [
    makePart("sentence_1", "I am Alex.", { normalization: { caseInsensitive: true, ignorePunctuation: true } }),
    makePart("sentence_2", "She is a student.", { normalization: { caseInsensitive: true, ignorePunctuation: true } }),
    makePart("sentence_3", "They are friends.", { normalization: { caseInsensitive: true, ignorePunctuation: true } }),
    makePart("sentence_4", "We are from Poland.", { normalization: { caseInsensitive: true, ignorePunctuation: true } })
  ]);
  const good = evaluateAnswer({ task: t, response: {
    sentence_1: "i am alex", sentence_2: "SHE IS A STUDENT!",
    sentence_3: "they are friends", sentence_4: "WE ARE FROM POLAND?"
  }});
  assert.equal(good.outcome, "CORRECT");
  const badOrder = evaluateAnswer({ task: t, response: {
    sentence_1: "Alex I am", sentence_2: "She is a student.",
    sentence_3: "They are friends.", sentence_4: "We are from Poland."
  }});
  assert.equal(badOrder.parts[0].outcome, "INCORRECT");
});

test("A5 incorrect finite True/False choice receives only the authored context diagnostic", () => {
  const diagnostics = [{
    diagnosticId: "A5-D1-CONTEXT-UNDERSTANDING",
    errorTag: "CONTEXT_UNDERSTANDING",
    responsePath: "decision_1",
    expectedRuleRef: "SET_A_EXERCISES_AND_ANSWER_FEEDBACK.md#A5/Error patterns",
    scope: "OUTSIDE_TARGET",
    when: { operator: "equals", value: "False" }
  }];
  const t = task("A5", "MULTI_PART", [
    makePart("decision_1", "True", { diagnostics }),
    makePart("decision_2", "False", { diagnostics: [{
      ...diagnostics[0], diagnosticId: "A5-D2-CONTEXT-UNDERSTANDING",
      responsePath: "decision_2", when: { operator: "equals", value: "True" }
    }] }),
    makePart("decision_3", "True", { diagnostics: [{
      ...diagnostics[0], diagnosticId: "A5-D3-CONTEXT-UNDERSTANDING",
      responsePath: "decision_3", when: { operator: "equals", value: "False" }
    }] })
  ]);
  const response = { decision_1: "False", decision_2: "False", decision_3: "True" };
  const evaluation = evaluateAnswer({ task: t, response });
  assert.equal(evaluation.outcome, "PARTIALLY_CORRECT");
  const classified = classifyDiagnostics({
    task: t, rawResponse: response, evaluation, answerEventId: "answer-A5-1",
    diagnosticTaxonomyVersion: "TO_BE_A1_v1.0.2-draft",
    allowedErrorTags: ["CONTEXT_UNDERSTANDING"]
  });
  assert.equal(classified.status, "CLASSIFIED");
  assert.equal(classified.records.length, 1);
  assert.equal(classified.records[0].partId, "decision_1");
  assert.equal(classified.records[0].errorTag, "CONTEXT_UNDERSTANDING");
});

test("A5 correct comprehension answers do not produce diagnostics", () => {
  const diagnostics = [{
    diagnosticId: "A5-D1-CONTEXT-UNDERSTANDING",
    errorTag: "CONTEXT_UNDERSTANDING", responsePath: "decision_1",
    expectedRuleRef: "SET_A_EXERCISES_AND_ANSWER_FEEDBACK.md#A5/Error patterns",
    scope: "OUTSIDE_TARGET", when: { operator: "equals", value: "False" }
  }];
  const t = task("A5", "MULTI_PART", [makePart("decision_1", "True", { diagnostics })]);
  const response = { decision_1: "True" };
  const evaluation = evaluateAnswer({ task: t, response });
  const classified = classifyDiagnostics({
    task: t, rawResponse: response, evaluation, answerEventId: "answer-A5-2",
    diagnosticTaxonomyVersion: "TO_BE_A1_v1.0.2-draft",
    allowedErrorTags: ["CONTEXT_UNDERSTANDING"]
  });
  assert.equal(classified.status, "NO_DIAGNOSTIC");
  assert.equal(classified.records.length, 0);
});

test("A7 wrong profile choice is not automatically collapsed into a grammar diagnosis", () => {
  const t = task("A7", "CHOICE", [makePart("choice", "A")]);
  const evaluation = evaluateAnswer({ task: t, response: { choice: "B" } });
  assert.equal(evaluation.outcome, "INCORRECT");
});


test("A1 source-listed wrong forms produce only the matching form diagnostic", () => {
  const diagnostics = [{
    diagnosticId: "A1-BLANK1-FORM-AM",
    errorTag: "FORM_AM", responsePath: "blank_1",
    expectedRuleRef: "SET_A_EXERCISES_AND_ANSWER_FEEDBACK.md#A1/Error patterns",
    scope: "TARGET_HYPOTHESIS",
    when: { operator: "oneOf", values: ["is", "are"], normalization: { caseInsensitive: true, ignorePunctuation: true } }
  }];
  const t = task("A1", "BLANKS", [
    makePart("blank_1", "am", {
      normalization: { caseInsensitive: true, ignorePunctuation: true }, diagnostics
    })
  ]);
  const response = { blank_1: "ARE!" };
  const evaluation = evaluateAnswer({ task: t, response });
  const classified = classifyDiagnostics({
    task: t, rawResponse: response, evaluation, answerEventId: "answer-A1-1",
    diagnosticTaxonomyVersion: "TO_BE_A1_v1.0.2-draft", allowedErrorTags: ["FORM_AM"]
  });
  assert.equal(evaluation.outcome, "INCORRECT");
  assert.equal(classified.status, "CLASSIFIED");
  assert.equal(classified.records[0].errorTag, "FORM_AM");
});

test("A3 source-listed wrong form is diagnosed without scoring unrelated sentence spelling", () => {
  const diagnostics = [{
    diagnosticId: "A3-BLANK6-FORM-ARE",
    errorTag: "FORM_ARE", responsePath: "blank_6",
    expectedRuleRef: "SET_A_EXERCISES_AND_ANSWER_FEEDBACK.md#A3/Error patterns",
    scope: "TARGET_HYPOTHESIS",
    when: { operator: "equals", value: "is" }
  }];
  const t = task("A3", "BLANKS", [makePart("blank_6", "are", { diagnostics })]);
  const response = { blank_6: "is", unrelatedSpelling: "Frnace" };
  const evaluation = evaluateAnswer({ task: t, response });
  const classified = classifyDiagnostics({
    task: t, rawResponse: response, evaluation, answerEventId: "answer-A3-1",
    diagnosticTaxonomyVersion: "TO_BE_A1_v1.0.2-draft", allowedErrorTags: ["FORM_ARE"]
  });
  assert.equal(evaluation.outcome, "INCORRECT");
  assert.equal(classified.records.length, 1);
  assert.equal(classified.records[0].errorTag, "FORM_ARE");
});

test("A4 exact source correction example is diagnosed despite harmless case and punctuation differences", () => {
  const diagnostics = [{
    diagnosticId: "A4-SENTENCE1-FORM-AM",
    errorTag: "FORM_AM", responsePath: "sentence_1",
    expectedRuleRef: "SET_A_EXERCISES_AND_ANSWER_FEEDBACK.md#A4/Error patterns",
    scope: "TARGET_HYPOTHESIS",
    when: { operator: "equals", value: "I is Alex.", normalization: { caseInsensitive: true, ignorePunctuation: true } }
  }];
  const t = task("A4", "MULTI_PART", [
    makePart("sentence_1", "I am Alex.", {
      normalization: { caseInsensitive: true, ignorePunctuation: true }, diagnostics
    })
  ]);
  const response = { sentence_1: "i IS alex!" };
  const evaluation = evaluateAnswer({ task: t, response });
  const classified = classifyDiagnostics({
    task: t, rawResponse: response, evaluation, answerEventId: "answer-A4-1",
    diagnosticTaxonomyVersion: "TO_BE_A1_v1.0.2-draft", allowedErrorTags: ["FORM_AM"]
  });
  assert.equal(evaluation.outcome, "INCORRECT");
  assert.equal(classified.records.length, 1);
  assert.equal(classified.records[0].errorTag, "FORM_AM");
});

test("A8 remains review-required without an authored deterministic rubric", () => {
  const t = task("A8", "OPEN_RESPONSE", []);
  const evaluation = evaluateAnswer({ task: t, response: { response: "My name is Alex. I am from Spain. I am happy. I am a student." } });
  assert.equal(evaluation.status, "REVIEW_REQUIRED");
});

test("Set A mapping normalization does not mutate raw learner responses", () => {
  const response = { sentence_1: "i AM alex!!!" };
  const before = JSON.stringify(response);
  const t = task("A6", "MULTI_PART", [
    makePart("sentence_1", "I am Alex.", { normalization: { caseInsensitive: true, ignorePunctuation: true } })
  ]);
  evaluateAnswer({ task: t, response });
  assert.equal(JSON.stringify(response), before);
});
