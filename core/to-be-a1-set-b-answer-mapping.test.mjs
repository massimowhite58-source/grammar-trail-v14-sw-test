import test from "node:test";
import assert from "node:assert/strict";
import { evaluateAnswer } from "./answer-evaluator.mjs";
import { classifyDiagnostics } from "./diagnostic-classifier.mjs";

const part = (partId, values, diagnostics = [], extra = {}) => ({
  partId, responsePath: partId,
  accepted: values.map((value, i) => ({ alternativeId: partId + "-alt-" + i, value })),
  diagnostics, ...extra
});
const task = (taskId, mode, parts) => ({
  taskId, contentVersion: "v1.0.2-draft",
  evaluation: { mode, ruleVersion: "TO_BE_A1_SET_B_v0.1-draft", parts }
});
const rule = (id, tag, path, when, heading) => ({
  diagnosticId: id, errorTag: tag, responsePath: path,
  expectedRuleRef: "SET_B_EXERCISES_AND_ANSWER_FEEDBACK.md#" + heading + "/Error patterns",
  scope: tag === "CONTEXT_UNDERSTANDING" ? "OUTSIDE_TARGET" : "TARGET_HYPOTHESIS",
  when
});
const classify = (t, response, evaluation, tags) => classifyDiagnostics({
  task: t, rawResponse: response, evaluation, answerEventId: "answer-" + t.taskId,
  diagnosticTaxonomyVersion: "TO_BE_A1_v1.0.2-draft", allowedErrorTags: tags
});

test("B1 remains one multi-part exercise and preserves two independent outcomes", () => {
  const t = task("B1", "MULTI_PART", [
    part("part_1_choice", ["B"], [
      rule("B1-P1-NEGATION", "NEGATION_PLACEMENT", "part_1_choice", { operator: "equals", value: "A" }, "B1"),
      rule("B1-P1-FORM", "FORM_IS", "part_1_choice", { operator: "equals", value: "C" }, "B1")
    ]),
    part("part_2_blank", ["aren't", "are not"], [
      rule("B1-P2-FORM", "NEGATIVE_FORM_ARE", "part_2_blank", { operator: "equals", value: "They isn't" }, "B1")
    ])
  ]);
  const response = { part_1_choice: "B", part_2_blank: "are not" };
  const evaluation = evaluateAnswer({ task: t, response });
  assert.equal(evaluation.outcome, "CORRECT");
  assert.equal(evaluation.parts.length, 2);
});

test("B1 exact authored wrong option identifies its source diagnostic", () => {
  const t = task("B1", "MULTI_PART", [
    part("part_1_choice", ["B"], [
      rule("B1-P1-NEGATION", "NEGATION_PLACEMENT", "part_1_choice", { operator: "equals", value: "A" }, "B1")
    ])
  ]);
  const response = { part_1_choice: "A" };
  const evaluation = evaluateAnswer({ task: t, response });
  const d = classify(t, response, evaluation, ["NEGATION_PLACEMENT"]);
  assert.equal(d.status, "CLASSIFIED");
  assert.equal(d.records[0].errorTag, "NEGATION_PLACEMENT");
});

test("B2 accepts both authored full and contracted negative forms", () => {
  const t = task("B2", "TRANSFORM", [
    part("response", ["They are not teachers.", "They aren't teachers."])
  ]);
  assert.equal(evaluateAnswer({ task: t, response: { response: "They are not teachers." } }).outcome, "CORRECT");
  assert.equal(evaluateAnswer({ task: t, response: { response: "They aren't teachers." } }).outcome, "CORRECT");
});

test("B2 diagnoses only the exact source-listed negation-placement example", () => {
  const t = task("B2", "TRANSFORM", [
    part("response", ["They are not teachers.", "They aren't teachers."], [
      rule("B2-NEGATION-PLACEMENT", "NEGATION_PLACEMENT", "response", { operator: "equals", value: "They not are teachers." }, "B2")
    ])
  ]);
  const response = { response: "They not are teachers." };
  const evaluation = evaluateAnswer({ task: t, response });
  const d = classify(t, response, evaluation, ["NEGATION_PLACEMENT"]);
  assert.equal(d.records.length, 1);
});

test("B3 requires the full be-form in each blank before not", () => {
  const t = task("B3", "BLANKS", [
    part("blank_1", ["am"]), part("blank_2", ["is"]), part("blank_3", ["are"]),
    part("blank_4", ["are"]), part("blank_5", ["are"])
  ]);
  const good = evaluateAnswer({ task: t, response: {
    blank_1: "am", blank_2: "is", blank_3: "are", blank_4: "are", blank_5: "are"
  }});
  assert.equal(good.outcome, "CORRECT");
  const contraction = evaluateAnswer({ task: t, response: {
    blank_1: "am", blank_2: "is", blank_3: "aren't", blank_4: "are", blank_5: "are"
  }});
  assert.equal(contraction.parts[2].outcome, "INCORRECT");
});

test("B3 source-listed singular/plural form substitution receives a specific diagnostic", () => {
  const t = task("B3", "BLANKS", [
    part("blank_3", ["are"], [
      rule("B3-BLANK3-FORM-ARE", "FORM_ARE", "blank_3", { operator: "equals", value: "is" }, "B3")
    ])
  ]);
  const response = { blank_3: "is" };
  const evaluation = evaluateAnswer({ task: t, response });
  const d = classify(t, response, evaluation, ["FORM_ARE"]);
  assert.equal(d.records[0].errorTag, "FORM_ARE");
});

test("B4 accepts both authored negative forms for correction 3", () => {
  const t = task("B4", "MULTI_PART", [
    part("correction_3", ["They aren't from Germany.", "They are not from Germany."])
  ]);
  assert.equal(evaluateAnswer({ task: t, response: { correction_3: "They aren't from Germany." } }).outcome, "CORRECT");
  assert.equal(evaluateAnswer({ task: t, response: { correction_3: "They are not from Germany." } }).outcome, "CORRECT");
});

test("B5 incorrect finite True/False decisions are context diagnostics, not grammar errors", () => {
  const t = task("B5", "MULTI_PART", [
    part("decision_1", ["False"], [rule("B5-D1-CONTEXT", "CONTEXT_UNDERSTANDING", "decision_1", { operator: "equals", value: "True" }, "B5")]),
    part("decision_2", ["True"], [rule("B5-D2-CONTEXT", "CONTEXT_UNDERSTANDING", "decision_2", { operator: "equals", value: "False" }, "B5")]),
    part("decision_3", ["False"], [rule("B5-D3-CONTEXT", "CONTEXT_UNDERSTANDING", "decision_3", { operator: "equals", value: "True" }, "B5")])
  ]);
  const response = { decision_1: "True", decision_2: "True", decision_3: "False" };
  const evaluation = evaluateAnswer({ task: t, response });
  const d = classify(t, response, evaluation, ["CONTEXT_UNDERSTANDING"]);
  assert.equal(evaluation.outcome, "PARTIALLY_CORRECT");
  assert.equal(d.records.length, 1);
  assert.equal(d.records[0].scope, "OUTSIDE_TARGET");
});

test("B6 standard short contractions are the accepted transformation outputs", () => {
  const t = task("B6", "MULTI_PART", [
    part("transformation_1", ["He isn't a teacher."]),
    part("transformation_2", ["They aren't at home."]),
    part("transformation_3", ["I'm not from Italy."])
  ]);
  const evaluation = evaluateAnswer({ task: t, response: {
    transformation_1: "He isn't a teacher.",
    transformation_2: "They aren't at home.",
    transformation_3: "I'm not from Italy."
  }});
  assert.equal(evaluation.outcome, "CORRECT");
});

test("B6 full form remains grammatically correct while failing the short-form instruction", () => {
  const t = task("B6", "MULTI_PART", [{
    partId: "transformation_1", responsePath: "transformation_1", primaryAxis: "grammar",
    axes: {
      grammar: { accepted: [{ alternativeId: "full", value: "He is not a teacher." }, { alternativeId: "short", value: "He isn't a teacher." }] },
      instruction: { accepted: [{ alternativeId: "short-only", value: "He isn't a teacher." }] }
    },
    diagnostics: [
      { ...rule("B6-INSTRUCTION-FOLLOWING", "INSTRUCTION_FOLLOWING", "transformation_1", { operator: "equals", value: "He is not a teacher." }, "B6"), axis: "instruction" }
    ]
  }]);
  const response = { transformation_1: "He is not a teacher." };
  const evaluation = evaluateAnswer({ task: t, response });
  const d = classify(t, response, evaluation, ["INSTRUCTION_FOLLOWING"]);
  assert.equal(evaluation.outcome, "CORRECT");
  assert.equal(evaluation.parts[0].axes.grammar.outcome, "CORRECT");
  assert.equal(evaluation.parts[0].axes.instruction.outcome, "INCORRECT");
  assert.equal(evaluation.dimensions.grammar.outcome, "CORRECT");
  assert.equal(evaluation.dimensions.instruction.outcome, "INCORRECT");
  assert.equal(d.records.length, 1);
  assert.equal(d.records[0].axis, "instruction");
  assert.equal(d.records[0].errorTag, "INSTRUCTION_FOLLOWING");
  assert.equal(d.records[0].scope, "INSTRUCTION");
});
test("B7 and B8 stay review-required without deterministic open-response rubrics", () => {
  const b7 = task("B7", "OPEN_RESPONSE", []);
  const b8 = task("B8", "OPEN_RESPONSE", []);
  assert.equal(evaluateAnswer({ task: b7, response: "Maria is a colleague." }).status, "REVIEW_REQUIRED");
  assert.equal(evaluateAnswer({ task: b8, response: "My name is Alex." }).status, "REVIEW_REQUIRED");
});

test("B1 two-part response is not mutated by evaluation", () => {
  const response = { part_1_choice: "B", part_2_blank: "aren't" };
  const before = JSON.stringify(response);
  const t = task("B1", "MULTI_PART", [
    part("part_1_choice", ["B"]), part("part_2_blank", ["aren't", "are not"])
  ]);
  evaluateAnswer({ task: t, response });
  assert.equal(JSON.stringify(response), before);
});
