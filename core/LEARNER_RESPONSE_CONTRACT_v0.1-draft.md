# Learner Response Contract v0.1-draft

Status: proposed Core Lab boundary contract; not yet implemented or approved for learner delivery.

## 1. Purpose

Define one canonical, UI-independent shape for capturing learner input before evaluation. The UI must not decide correctness. It records the learner's response; the deterministic Answer Evaluator evaluates that response against an authored descriptor.

This contract is intended to replace caller-supplied correctness booleans at the future evaluator-to-Learning-Core boundary.

## 2. Responsibilities

- UI: collect and serialize the learner's exact response.
- Response adapter: validate the response envelope and map stable authored part IDs to response values without changing the raw values.
- Answer Evaluator: calculate authored assessment-axis outcomes.
- Diagnostic Classifier: attach only source-authored diagnostics to incorrect axes.
- Learning Core: consume the evaluation result and use the explicit task-completion gate; it must not trust a UI-supplied `correct` boolean.

No component may rewrite the raw learner response.

## 3. Canonical envelope

```js
{
  responseSchemaVersion: "0.1",
  taskId: "<approved-task-id>",
  contentVersion: "<exact-content-version>",
  responseId: "<unique-response-id>",
  response: {
    "<approved-part-id>": "<raw learner value>"
  }
}
```

Rules:
- `taskId` and `contentVersion` must match the delivered task.
- `responseId` is stable for one submitted response and is used to link evaluation/diagnostic records to the immutable answer event.
- `response` is keyed by stable part IDs from the approved semantic mapping.
- Values retain their submitted type and exact content. Do not trim, lowercase, strip punctuation, or otherwise normalize at the UI boundary.
- A missing required part is not an incorrect answer; it returns `REVIEW_REQUIRED` or a distinct incomplete-response state.
- Extra or unknown part IDs must be rejected or explicitly quarantined; they must not be silently discarded.
- The response envelope and raw response are immutable after submission.

## 4. Task-mode serialization

The exact part IDs must come from the approved mapping. The examples below use descriptive placeholders and do not assign production IDs.

### CHOICE

Store a stable authored option identifier, not an array index or display text alone:

```js
{ "<part-id>": { "selectedOptionId": "<authored-option-id>" } }
```

The option identifier must resolve to exactly one option in the delivered task version. The UI's visual order may change without changing the identifier.

### BLANKS

Store one raw value per blank:

```js
{
  "<blank-part-id-1>": "<raw value>",
  "<blank-part-id-2>": "<raw value>"
}
```

Do not send only a fully rendered sentence if the authored evaluator is intended to assess individual blanks.

### MULTI_PART

Store one raw value per independently assessed part:

```js
{
  "<part-id-1>": "<raw value>",
  "<part-id-2>": "<raw value>"
}
```

All parts of one authored exercise remain inside one response envelope and one answer event unless the content contract explicitly defines a separate task.

### MATCHING

Store stable left-item identifiers mapped to stable right-item identifiers. Do not use visible row/column positions as persistent identity.

### TRANSFORM

Store the learner's complete transformed response as entered. The evaluator may assess grammar and instruction compliance as separate axes against the same raw value.

### OPEN_RESPONSE

Store the complete raw text. If no authored deterministic rubric exists, preserve it and return `REVIEW_REQUIRED`; examples are not an automatic scoring rubric.

## 5. Independent assessment axes

- A single response part may be evaluated against multiple independent axes.
- The axis descriptors and `requiredAxes` must be authored in the semantic mapping.
- `primaryAxis` preserves a compatibility result; `taskSatisfied` is the task completion gate across all required axes.
- The UI must display or submit the raw answer only. It must not derive axis outcomes.
- For B6, the same full sentence is assessed as grammatically correct and instruction-noncompliant; a contracted form can satisfy both axes.

## 6. Event and evaluation boundary

The intended processing sequence is:

1. Validate envelope identity and schema version.
2. Append the immutable raw answer event.
3. Evaluate the raw response using the exact versioned descriptor.
4. Classify diagnostics against the same raw response and exact answer-event reference.
5. Pass the evaluator result, including `taskSatisfied`, to Learning Core.
6. Append evaluation and diagnostic facts as separate immutable records according to the event taxonomy.

If evaluation requires review, do not manufacture a boolean correctness value. Preserve the response and route it to review.

## 7. Compatibility and migration

- The current `core-demo.html` uses a legacy payload (`{ selectedIndex, selectedText }` or `{ text }`) and computes a boolean `correct` in the caller.
- This draft does not silently reinterpret that legacy payload as the canonical contract.
- A future adapter may translate legacy demo payloads only where the mapping is lossless and explicitly tested.
- No existing learner history is migrated or rewritten by this contract.

## 8. Validation gates

Before implementation:
1. Approve stable part and option identifiers in each semantic mapping.
2. Confirm the exact task/content version binding.
3. Define unknown-part and incomplete-response behavior.
4. Test that raw strings and values are preserved byte-for-byte / value-for-value.
5. Test multi-part responses, matching pairs, and independent axes.
6. Prove the UI cannot submit a correctness boolean as an authority.
7. Prove Learning Core gates progression on `taskSatisfied` when required axes are present.
8. Keep open responses review-required unless a supported authored rubric is explicitly approved.

## 9. Current limitations

- This is a design draft only. No UI, response adapter, Learning Core API, persistence event, or Content Library source has been changed.
- Stable production part IDs and option IDs remain unapproved.
- The current Set B mapping remains a draft; no B1–B8 response paths are verified against a TO BE A1 learner interface.
