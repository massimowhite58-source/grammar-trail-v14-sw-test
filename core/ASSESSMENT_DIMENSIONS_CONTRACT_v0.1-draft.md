# Assessment Dimensions Contract v0.1-draft

Status: Core Lab evaluator contract draft; not a learner-facing scoring policy.

## 1. Purpose

A single learner response can satisfy one criterion and fail another. The evaluator must not collapse independent criteria into one undifferentiated correctness value.

Initial use case: Set B, exercise B6. A full negative form can be grammatically correct while failing an instruction that explicitly requests a contracted form.

## 2. Assessment dimensions

An assessment dimension is a separately evaluated criterion with its own authored accepted values and optional normalization.

Initial dimensions:
- `grammar`: correctness of the target grammatical construction.
- `instruction`: compliance with the response format or operation explicitly requested by the task.

Future dimensions (not implemented by this contract yet) may include context understanding, factual accuracy, and communication completion. They must not be silently merged into grammar.

## 3. Descriptor shape

A part may declare an `axes` object. Each axis contains its own non-empty `accepted` list and may declare its own normalization rules.

```js
{
  partId: "transformation_1",
  responsePath: "transformation_1",
  primaryAxis: "grammar",
  axes: {
    grammar: {
      accepted: [
        { alternativeId: "full", value: "He is not a teacher." },
        { alternativeId: "short", value: "He isn't a teacher." }
      ]
    },
    instruction: {
      accepted: [
        { alternativeId: "short-only", value: "He isn't a teacher." }
      ]
    }
  },
  diagnostics: [
    {
      diagnosticId: "B6-INSTRUCTION-FOLLOWING",
      errorTag: "INSTRUCTION_FOLLOWING",
      axis: "instruction",
      responsePath: "transformation_1",
      scope: "INSTRUCTION",
      expectedRuleRef: "SET_B_EXERCISES_AND_ANSWER_FEEDBACK.md#B6",
      when: { operator: "equals", value: "He is not a teacher." }
    }
  ]
}
```

The example illustrates the contract only; it is not a complete B6 mapping.

## 4. Evaluation behavior

- Each axis is assessed independently against its own authored accepted values.
- `primaryAxis` determines the legacy part outcome and task-level `outcome`. If omitted, the default is `answer`.
- Per-part axis results are returned in `part.axes`.
- Aggregate results are returned in `evaluation.dimensions`.
- Existing descriptors without `axes` remain compatible through an implicit `answer` axis.
- A missing response value makes the evaluation `REVIEW_REQUIRED`; it must not be treated as incorrect.
- Raw learner responses are immutable and are never normalized in place.
- This contract does not prescribe a learner-facing percentage, penalty, or progress change.

## 5. Diagnostic behavior

- A diagnostic rule may declare `axis`.
- The classifier evaluates the rule only when that axis is `INCORRECT`.
- A rule without `axis` uses the part's `primaryAxis` (or legacy `answer`).
- A correct grammar axis must not suppress a valid instruction-axis diagnostic.
- A diagnostic on one axis must not change the result of another axis.
- Exact source conditions remain mandatory; examples do not create catch-all rules.

## 6. Validation requirements

Before a content block can use multiple axes:
1. Every axis has a stable name and non-empty authored accepted values.
2. `primaryAxis`, when present, names a declared axis.
3. Each diagnostic's axis names a declared axis.
4. Diagnostic conditions cite exact source criteria and do not create implicit catch-alls.
5. UI response paths are verified against actual submitted payloads.
6. Tests prove both independent outcomes and raw-response immutability.
7. The content block has approved hypothesis/phase mapping and feedback/recovery references.

## 7. Current limitations

- Evaluator v0.2 and classifier v0.3 implement independent axis evaluation and axis-scoped diagnostics.
- The Set B B6 test currently proves one full-form example only. Complete descriptors and tests for all three B6 transformations remain outstanding.
- The current evaluator does not infer semantic grammar correctness. Each axis still requires explicit authored accepted values or a future explicitly supported rubric.
- No learner UI, progress formula, or Runtime persistence integration is added by this contract.
