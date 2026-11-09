# Semantic Mapping Contract v0.1-draft

Status: design contract; not learner-deliverable.
Package scope: TO BE A1 v1.0.2-draft (A1–D8).
Target branch: feat/persistence-adapter-test-double.

## 1. Purpose

Semantic Mapping converts the preserved authored sections from an ingested content package into explicit, versioned Runtime descriptors. It does not rewrite source content and does not infer answers, accepted alternatives, error conditions, hypothesis IDs, phase compatibility, or open-response rubrics.

The mapping is a separate artifact. The original Markdown package remains the editorial source of truth.

## 2. Required exercise record

Each exercise mapping must contain:

- packageId and contentVersion;
- mappingVersion and mappingStatus;
- exerciseId and sourceRef (documentPath + exact exercise heading);
- promptMode, chosen only from a documented supported evaluator mode;
- hypothesisId, only when an existing approved project identifier is confirmed;
- targetConcept and responseShape, as explicit authored mapping metadata;
- evaluation descriptor or an explicit non-executable state;
- diagnostic rules, each linked to an exact source criterion;
- feedbackRef and recoveryRef, pointing to the corresponding authored sections;
- unresolvedItems, listing every missing or ambiguous decision.

No exercise may be executable while a required field is unresolved.

## 3. Evaluation descriptor

The current Answer Evaluator supports:

- CHOICE
- BLANKS
- MATCHING
- TRANSFORM
- MULTI_PART
- OPEN_RESPONSE

For deterministic modes, each part requires:

- stable partId;
- responsePath when the response shape is not the partId;
- accepted: a non-empty list of { alternativeId, value } entries;
- normalization flags only where the source explicitly permits them;
- supported normalization flags are `trim`, `collapseInternalWhitespace`, `caseInsensitive`, and `ignorePunctuation`; use `ignorePunctuation` only where the source explicitly allows punctuation differences;
- diagnostics: an explicit array, including an empty array when no deterministic diagnostic rule is authored.

Accepted values must preserve the exact answer semantics and ordering constraints from the source. An unordered response is allowed only where the source explicitly says display/order is irrelevant.

OPEN_RESPONSE must remain REVIEW_REQUIRED unless an explicit deterministic rubric exists and is supported by the evaluator. A sample answer or list of possible answers is not a rubric.

## 4. Diagnostic rule mapping

Each rule must satisfy Conditional Diagnostic Contract v0.1-draft:

- diagnosticId;
- errorTag from the package taxonomy allowlist;
- responsePath into the raw response;
- expectedRuleRef to the exact authored source criterion;
- scope: TARGET_HYPOTHESIS, OUTSIDE_TARGET, INSTRUCTION, or COMMUNICATION;
- when: explicit equals, oneOf, or carefully justified notOneOf condition.

The source often names an Error Pattern and gives an example, but that does not automatically define a complete closed set of learner responses. Do not turn an example into a catch-all. If the observed answer cannot be mapped to a specific source-backed condition, leave the part without an executable diagnostic rule or mark the mapping REVIEW_REQUIRED.

Multiple rules may match only when the source defines distinct independent criteria. If overlap cannot be justified, mark REVIEW_REQUIRED; do not rely on runtime rule order.

Correct evaluator outcomes do not produce error diagnostics. Diagnostics never alter correctness. Context, instruction, communication, article usage, and target grammar remain separate dimensions.

## 5. Feedback and recovery

Store source references, not paraphrased or regenerated text, for the authored Feedback and Recovery Mapping sections. A Runtime policy may point to a specific tag/part criterion only when that relationship is explicit in the source.

Do not invent new recovery tasks or replace the learner's whole response. Recovery should target only the evidenced error or missing communication element.

## 6. Hypothesis and phase compatibility

Do not create or guess hypothesisId values. Resolve them against an approved project registry or mark them unresolved.

Do not infer phase mappings from exercise order, set name, or apparent difficulty. A missing approved phase mapping remains unresolved and blocks delivery.

## 7. Mapping lifecycle

- SOURCE_PARSED_REQUIRES_SEMANTIC_MAPPING: ingestion only; no executable mapping.
- MAPPING_DRAFT: source-grounded draft exists, but at least one decision remains unresolved.
- REVIEW_REQUIRED: source does not support a safe deterministic interpretation.
- READY_FOR_VALIDATION: every required mapping field is explicit and schema-valid; not yet validated.
- VALIDATED: the exact source version and mapping version pass structural, evaluator, diagnostic, and integration tests.

Draft and review-required records are never learner-deliverable.

## 8. Source-specific constraints for TO BE A1 v1.0.2-draft

- Preserve 32 exercise IDs A1–D8, eight per set.
- B1 is one exercise with two independently evaluated parts.
- D3 is one exercise with five separately authored diagnostic subrecords.
- D8 is one exercise with two communication parts; its open-ended answers are not automatically gradeable.
- A8, B7, B8, C8, D7, and D8 must not receive an automatic semantic/open-response score without an explicit deterministic rubric.
- A5 and B5 are context-comprehension tasks; do not interpret a wrong True/False answer as evidence of independent negative construction.
- A7 separates profile understanding from factual accuracy.
- D4 separates grammatical construction from consistency with supplied facts.
- A diagnostic condition must be supported by the actual authored criterion, not merely by the Error Tag name or a sample example.

## 9. Validation gates

Before READY_FOR_VALIDATION:

1. All 32 IDs and source references match the exact v1.0.2-draft files.
2. Every prompt mode and response path is explicit.
3. Every deterministic part has exact expected values and accepted alternatives.
4. Every normalization rule is source-authorized.
5. Every diagnostic rule has a valid canonical tag, explicit condition, source reference, scope, and unique ID.
6. Overlapping rules are either source-justified as independent or resolved.
7. Feedback and recovery references resolve to the exact authored sections.
8. Hypothesis and phase mappings resolve to approved project registries.
9. Open-response tasks remain REVIEW_REQUIRED unless a supported rubric is present.
10. Package-specific tests and shared evaluator/classifier tests pass for the exact source and mapping versions.

## 10. Non-goals

This contract does not modify Content Library source, invent new English rules or alternatives, add fuzzy/AI grading, assign unapproved hypothesis IDs, infer learning phases, or approve content for learner delivery.
