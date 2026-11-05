# Answer Evaluation & Diagnostic Classification Contract v0.1-draft

**Status:** Proposed Core Lab implementation contract  
**Scope:** deterministic evaluation of authored TO BE A1 tasks; no AI, network service, UI integration, or Content Library mutation  
**Content source:** `TO_BE_A1_FULL_CONTENT_LIBRARY v1.0.2-draft`  
**Compatibility:** existing `learning-core.mjs`, `content-runtime.mjs`, `task-runtime.mjs`, and `recovery-runtime.mjs`

This document defines the boundary before implementation. It does not claim that the runtime described here already exists.

## 1. Non-negotiable invariants

1. The learner's original response is immutable historical evidence. Evaluation must never normalize or replace the stored raw response.
2. Evaluation is a pure operation: same task version + same raw response + same evaluator version = same result.
3. Correctness is not inferred from response speed. A slow correct answer remains correct.
4. Accepted alternatives are authored content rules, not fuzzy similarity.
5. A grammatically valid answer that misses an instruction is not labelled grammatically incorrect.
6. An error outside the target hypothesis (for example, article usage in a `to be` task) is recorded separately and must not reduce the `to be` result.
7. Multiple independent errors produce multiple diagnostic records. One underlying error must not be duplicated under broad and narrow tags without explicit authored justification.
8. Skill tags, score dimensions, and Error Pattern tags are separate namespaces.
9. Unknown, ambiguous, unsupported, or open-ended responses fail closed to `REVIEW_REQUIRED`; they are not guessed correct or incorrect.
10. All derived evaluation/diagnostic/feedback records reference the immutable answer event and carry content/schema/runtime versions.

## 2. Responsibility boundaries

| Component | Responsibility | Must not do |
|---|---|---|
| Answer Evaluator | Compare response with the task's authored answer contract; determine task-part outcome | Invent grammar rules, infer a learner trait, diagnose causes |
| Diagnostic Classifier | Map observable mismatches to authored Error Pattern tags and independent records | Change correctness, merge distinct errors, infer beyond evidence |
| Feedback Resolver (later stage) | Select authored feedback for an outcome/diagnostic | Generate unapproved teaching content |
| Recovery Runtime | Select next support using diagnostics + authored recovery mapping + User State | Reveal final answer or rewrite history |
| Learning Core | Append events and reconstruct state | Re-evaluate content or trust a caller-supplied arbitrary boolean after integration |

The current Learning Core accepts a caller-supplied `correct` boolean. Integration must replace that trust boundary with a validated evaluator result; do not silently change existing event history or old event interpretation.

## 3. Answer Evaluator contract

### 3.1 Input

```js
{
  task,                 // exact approved task resolved by Content Runtime
  response,             // raw learner response; preserve as submitted
  evaluatorVersion,     // e.g. "0.1.0"
  submittedAt,          // optional timestamp; timing is not a correctness input
}
```

The task must carry a content-authored evaluation descriptor, or be transformed by a versioned adapter from the package's Markdown. The evaluator must not scrape instructional prose and guess the answer contract at runtime.

### 3.2 Normalized authored evaluation descriptor

The initial adapter supports only explicitly configured response modes:

- `CHOICE`: one option identifier or authored equivalent.
- `BLANKS`: ordered slots with accepted tokens per slot.
- `MATCHING`: relation pairs; presentation order may be ignored only when the descriptor says so.
- `TRANSFORM`: expected transformation with explicitly listed accepted outputs.
- `MULTI_PART`: independently scored child parts (required for B1).
- `OPEN_RESPONSE`: explicit rubric/checklist. If no deterministic rules are available, return `REVIEW_REQUIRED`; do not pretend a language-understanding engine exists.

Example descriptor:

```js
{
  mode: "BLANKS",
  parts: [{
    partId: "A1-1",
    expected: ["am"],
    accepted: ["am"],
    normalization: { trim: true, caseInsensitive: true, collapseInternalWhitespace: false }
  }]
}
```

The descriptor is a normalized runtime representation, not a change to the source Content Library. It must retain `sourceExerciseId`, `sourceContentVersion`, and the source answer/alternatives reference.

### 3.3 Output

```js
{
  status: "EVALUATED" | "REVIEW_REQUIRED" | "REJECTED",
  outcome: "CORRECT" | "PARTIALLY_CORRECT" | "INCORRECT" | null,
  taskCorrect: boolean | null,
  parts: [{
    partId: string,
    outcome: "CORRECT" | "INCORRECT" | "REVIEW_REQUIRED",
    matchedAlternativeId: string | null
  }],
  rawResponseRef: string,
  evaluatorVersion: string,
  contentVersion: string,
  evaluationRuleVersion: string
}
```

- `taskCorrect` is `true` only when every required part is correct and the task's completion criteria are met.
- `taskCorrect` is `false` only when the deterministic evaluator has enough evidence to establish an incorrect required part.
- `taskCorrect` is `null` for `REVIEW_REQUIRED` or `REJECTED`.
- B1 remains one exercise with two independently scored parts. Part-level results must not inflate the exercise count.
- D3 remains one exercise. Its five separately observed issues may create five diagnostic records; they do not create five exercises.
- Do not use edit-distance, semantic similarity, spell-correction, or unlisted paraphrases as implicit acceptance.
- Normalization is limited to the exact flags authored in the descriptor. Never normalize away meaningful grammatical distinctions.

## 4. Diagnostic Classifier contract

### 4.1 Input

```js
{
  task,
  rawResponse,
  evaluation,
  answerEventId,
  diagnosticTaxonomyVersion,
  classifierVersion
}
```

The classifier requires an evaluated response and the exact persisted `ANSWER_SUBMITTED` event ID. It does not run on an unpersisted guess.

### 4.2 Output

```js
{
  status: "CLASSIFIED" | "NO_DIAGNOSTIC" | "REVIEW_REQUIRED",
  answerEventId: string,
  records: [{
    diagnosticId: string,
    partId: string,
    errorTag: string,
    evidence: {
      responsePath: string,
      observedValue: unknown,
      expectedRuleRef: string
    },
    scope: "TARGET_HYPOTHESIS" | "OUTSIDE_TARGET" | "INSTRUCTION" | "COMMUNICATION",
    contentVersion: string,
    diagnosticTaxonomyVersion: string,
    classifierVersion: string
  }]
}
```

### 4.3 Classification rules

- Use the most specific supported canonical tag from the package taxonomy.
- Never substitute `GRAMMAR_ACCURACY`, `COMMUNICATION_COMPLETION`, `CONTEXT_TRANSFER`, or `MIXED_FORM_SELECTION` for a concrete error tag; these are dimensions/skill/task tags in this package.
- `ARTICLE_USAGE` is outside the `to be` target unless a task explicitly targets articles. It must not lower the `to be` score.
- `INSTRUCTION_FOLLOWING` is an instruction-compliance record. A grammatical full form in a task requesting a contraction is not a grammar error.
- `DIALOGUE_CONSTRUCTION` is distinct from grammar correctness.
- Do not infer `INDEPENDENT_PRODUCTION` from a single grammar error. Apply it only when the exercise's production criteria support it.
- Emit one record per independent cause. If one observable defect supports two overlapping tags, choose the narrower tag unless the content rule explicitly requires both.
- Different slots/parts may have separate records even when the same tag recurs, provided each has its own evidence path.
- A correct response may still have an out-of-target note only if an authored rule explicitly supports it; do not invent diagnostics to fill an empty list.
- Unknown tag, missing evidence path, or mismatch between taxonomy version and content version returns `REVIEW_REQUIRED`, not a fabricated tag.

## 5. Event model and history preservation

The following are proposed append-only event types. They are not yet implemented by this contract document.

### `ANSWER_SUBMITTED`
Stores the raw response exactly as received, plus task/part identity, session, content version, and timestamp. It must not be rewritten after evaluation.

### `ANSWER_EVALUATED`
References `answerEventId`; stores evaluator outcome, per-part outcomes, evaluator/rule versions, and result hash or deterministic result payload.

### `DIAGNOSTIC_CLASSIFIED`
One event may reference the classifier run, but each independent diagnostic record must have a stable unique `diagnosticId`. Records must remain individually queryable and link to the same `answerEventId`.

### `FEEDBACK_SELECTED` (later stage)
References answer and diagnostic IDs plus authored feedback entry/version.

### `RECOVERY_PLAN_SELECTED` (later stage)
References answer and diagnostic IDs, recovery mapping entry/version, User State snapshot/reference, and chosen support step.

Never mutate an earlier event to attach later evaluation. Append a new event that references it. The existing event store's append-only and duplicate/conflict rules remain in force.

## 6. Required first implementation scope

Implement only:

1. A small normalized descriptor validator.
2. Deterministic evaluation for `CHOICE`, `BLANKS`, `MATCHING`, `TRANSFORM`, and `MULTI_PART`.
3. Explicit `REVIEW_REQUIRED` for unsupported `OPEN_RESPONSE` descriptors.
4. Diagnostic classification driven by authored per-part rules, not free-form AI inference.
5. A compatibility boundary that produces a validated evaluator result before Learning Core accepts correctness.
6. Unit tests for immutability, deterministic output, exact alternatives, multiple independent errors, and out-of-target errors.

Do not implement feedback generation, AI, fuzzy NLP, full CEFR phase expansion, or learner UI in this stage.

## 7. Acceptance tests

| ID | Scenario | Expected |
|---|---|---|
| AE-01 | Exact expected answer | CORRECT |
| AE-02 | Explicit accepted alternative | CORRECT |
| AE-03 | Unlisted alternative | Not silently accepted |
| AE-04 | Case difference where case-insensitive is authored | CORRECT |
| AE-05 | Whitespace difference where trim is authored | CORRECT |
| AE-06 | Meaningful form difference | INCORRECT |
| AE-07 | B1 part 1 correct, part 2 incorrect | One exercise; PARTIALLY_CORRECT; two part results |
| AE-08 | Unsupported open response | REVIEW_REQUIRED |
| AE-09 | Same input and versions repeated | Byte-equivalent deterministic result, excluding generated timestamps/IDs |
| AE-10 | Slow but correct response | CORRECT |
| DC-01 | One supported error | One specific diagnostic record |
| DC-02 | Two independent errors in separate slots | Two records, each with its own evidence path |
| DC-03 | Same underlying error matches broad and narrow patterns | One narrow record unless authored rule says otherwise |
| DC-04 | Article error in a to-be target task | ARTICLE_USAGE outside target; no to-be penalty |
| DC-05 | Grammatical full form where contraction requested | INSTRUCTION_FOLLOWING, not grammar error |
| DC-06 | Unknown tag or missing evidence | REVIEW_REQUIRED |
| DC-07 | No supported error | NO_DIAGNOSTIC |
| DC-08 | Original response changes after evaluation attempt | Original answer event remains byte-equivalent |
| DC-09 | Five independent D3 causes | Five separate records, one exercise, same answerEventId |
| DC-10 | Re-evaluate same answer with same versions | Stable diagnostic result; no duplicate event append on retry |

## 8. Explicit non-goals and open decisions

- This contract does not define a general English grammar parser.
- It does not solve arbitrary open-ended sentence evaluation. Such answers require authored deterministic criteria or a separately governed review component.
- It does not decide the long-term six-skill evidence model or change the current Learning Core phase sequence.
- It does not automatically map all 32 Markdown exercises into runtime descriptors. That is a separate versioned adapter task.
- It does not authorize edits to Content Library v1.0.2-draft.
- Before implementing event append behavior, confirm the repository's current event naming/schema and integration test conventions. Preserve backward compatibility for existing `ANSWER_SUBMITTED` records.
