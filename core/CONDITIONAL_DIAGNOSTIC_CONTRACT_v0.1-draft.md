# Conditional Diagnostic Contract v0.1-draft

Status: design contract for Core Lab; not yet implemented.
Scope: deterministic, authored diagnostics for TO BE A1 v1.0.2-draft and future content packages.
Target branch: feat/persistence-adapter-test-double.

## 1. Purpose

The Answer Evaluator determines whether each response part matches an explicitly authored accepted answer. The Diagnostic Classifier must then determine which authored Error Pattern, if any, is supported by the raw response. An incorrect part alone is not sufficient evidence for every diagnostic rule attached to that part.

## 2. Invariants

1. Raw learner responses and persisted answer events are immutable.
2. A diagnostic is emitted only when an explicit authored condition matches observed evidence.
3. No diagnostic is inferred from general language knowledge, the task title, a skill tag, or the fact that a part is incorrect.
4. Use the most specific supported Error Tag. Do not emit duplicate or overlapping diagnoses for one evidenced error unless the source explicitly defines independent errors.
5. Independent errors in one exercise produce separate records linked to the same answerEventId.
6. Skill tags and aggregate dimensions are not Error Tags.
7. Grammatically acceptable alternatives must not be diagnosed merely because they differ from the model answer.
8. Missing, ambiguous, malformed, or unsupported diagnostic conditions fail closed as REVIEW_REQUIRED.
9. A diagnostic never changes the evaluator's correctness result. For example, ARTICLE_USAGE, INSTRUCTION_FOLLOWING, and DIALOGUE_CONSTRUCTION remain separate from target grammar accuracy.
10. Historical events are never rewritten; taxonomy migration is a read/display mapping only.

## 3. Authored diagnostic rule shape

Each evaluation part may declare zero or more diagnostic rules. A rule requires:

- diagnosticId: stable unique identifier within the task descriptor.
- errorTag: exact canonical tag from the package taxonomy allowlist.
- responsePath: path into the untouched raw response.
- expectedRuleRef: source reference identifying the authored expected rule or criterion.
- scope: TARGET_HYPOTHESIS | OUTSIDE_TARGET | INSTRUCTION | COMMUNICATION.
- when: explicit deterministic condition over the observed response value.

Supported v0.1 condition operators:
- equals: exact JSON-value equality.
- oneOf: exact match against a non-empty authored list.
- notOneOf: exact match exclusion against a non-empty authored list, only when the source explicitly defines that diagnostic boundary.

No regular expressions, fuzzy matching, stemming, semantic similarity, generated conditions, or implicit catch-all rules in v0.1. Normalization is allowed only when explicitly authored on the condition and must use the same narrow flags as evaluation: trim, collapseInternalWhitespace, caseInsensitive.

A rule without a complete condition is not executable and returns REVIEW_REQUIRED; it must not fall back to “part outcome is INCORRECT”.

## 4. Classification algorithm

For each evaluation part:
1. If the part outcome is CORRECT, do not run its error rules.
2. If the part outcome is REVIEW_REQUIRED or the evaluation itself is not EVALUATED, return REVIEW_REQUIRED.
3. For an INCORRECT part, inspect each authored rule's responsePath in rawResponse.
4. Validate the rule shape, taxonomy allowlist, scope, expectedRuleRef, diagnosticId uniqueness, and condition.
5. Evaluate the condition deterministically against the observed value.
6. Emit one record for each matching, independently authored rule.
7. If no rule matches, return NO_DIAGNOSTIC for that part; do not invent a fallback diagnosis.
8. If two matching rules would describe the same evidence without explicit source justification, the mapping author must resolve the overlap before delivery. Runtime must not silently choose one.
9. Records include answerEventId, taskId, partId, diagnosticId, errorTag, observed evidence, expectedRuleRef, scope, contentVersion, taxonomy version, and classifier version.

A classifier-level result may be CLASSIFIED if at least one record is emitted, NO_DIAGNOSTIC if no record is emitted, or REVIEW_REQUIRED if any required mapping is invalid or ambiguous. Partial diagnostic output must not be returned on REVIEW_REQUIRED.

## 5. Mapping and delivery states

- SOURCE_PARSED_REQUIRES_SEMANTIC_MAPPING: source structure parsed; no executable semantics.
- MAPPED_DRAFT: explicit evaluation and diagnostic mappings attached; not deliverable.
- REVIEW_REQUIRED: source or mapping does not support safe deterministic evaluation/diagnosis.
- READY_FOR_VALIDATION: mapping complete and schema-valid; still requires content-specific and integration tests.
- VALIDATED: required automated tests passed for the exact content version and mapping version.

OPEN_RESPONSE remains REVIEW_REQUIRED unless the package supplies a deterministic, explicit rubric and the evaluator supports its exact criteria. A sample answer alone is not a rubric.

## 6. Test matrix

| Case | Input / condition | Expected |
|---|---|---|
| D01 | Incorrect part; one exact authored condition matches | One corresponding diagnostic record |
| D02 | Incorrect part; no authored condition matches | NO_DIAGNOSTIC; no fallback tag |
| D03 | Incorrect part; two distinct conditions match with source-backed independent criteria | Two separate records, same answerEventId |
| D04 | Incorrect part; overlapping rules have no source-backed distinction | REVIEW_REQUIRED |
| D05 | Correct part with diagnostic rules attached | No diagnostic records |
| D06 | Missing raw response path | REVIEW_REQUIRED |
| D07 | Missing condition or expectedRuleRef | REVIEW_REQUIRED |
| D08 | Unknown/reserved/aggregate tag | REVIEW_REQUIRED |
| D09 | Duplicate diagnosticId | REVIEW_REQUIRED |
| D10 | Accepted alternative matched by evaluator | CORRECT; no error diagnosis |
| D11 | Full form used where contraction explicitly required | INSTRUCTION_FOLLOWING only if the authored condition identifies it; do not mark grammar incorrect |
| D12 | ARTICLE_USAGE outside target grammar | Separate OUTSIDE_TARGET diagnostic; does not change target grammar score |
| D13 | D3 five independently authored sub-errors | Up to five records, one per evidenced error, one answerEventId |
| D14 | B1 two parts, one correct and one incorrect | Partial correctness preserved; diagnose only incorrect part |
| D15 | D8 open-ended response without deterministic rubric | REVIEW_REQUIRED |
| D16 | Raw response before and after classification | Byte/value-equivalent; no mutation |
| D17 | Same task, response, versions | Deterministic identical output |
| D18 | Historical event already stored | Classifier adds linked diagnostic records; never updates prior event |

## 7. TO BE A1 mapping constraints

- Use only canonical Error Tags authored in DIAGNOSTIC_TAXONOMY_AND_RECOVERY_MAP.md.
- Preserve exact authored expected answers, accepted alternatives, feedback and recovery references.
- FORM_AM, FORM_IS, and FORM_ARE should be used only when the erroneous form is explicitly identifiable from the raw response.
- FORM_SELECTION is appropriate only where the source says the specific form cannot be localized.
- ARTICLE_USAGE, INSTRUCTION_FOLLOWING, and DIALOGUE_CONSTRUCTION must remain separate from target to-be grammar accuracy.
- B1 remains one exercise with independently evaluated parts.
- D3 remains one exercise with five independently diagnosed sub-results.
- D8 remains one exercise with two communication parts; do not infer an automatic open-response rubric.
- No exercise mapping may be marked READY_FOR_VALIDATION while any required answer, alternative, hypothesis, diagnostic condition, feedback, or recovery mapping is unresolved.

## 8. Non-goals

This contract does not define new English grammar rules, author new answer alternatives, infer diagnostic conditions, alter the source Content Library, modify learning progression, or change persisted historical events.
