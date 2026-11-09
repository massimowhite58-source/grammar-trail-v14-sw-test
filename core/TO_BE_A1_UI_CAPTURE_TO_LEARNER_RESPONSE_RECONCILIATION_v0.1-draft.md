# TO BE A1 UI Capture ↔ Learner Response Contract Reconciliation v0.1-draft

**Status:** Design reconciliation; no canonical contract approval.  
**Observed UI source:** `core/to-be-a1-lab.html`  
**Observed capture contract:** `core/TO_BE_A1_RAW_UI_CAPTURE_CONTRACT_v0.1-draft.md`  
**Canonical proposal:** `core/LEARNER_RESPONSE_CONTRACT_v0.1-draft.md`  
**Identity proposal:** `core/TO_BE_A1_UI_MANIFEST_v0.1-draft.md`

## 1. Purpose

Compare the raw snapshot currently emitted by the isolated TO BE A1 renderer with the existing UI-independent Learner Response Contract proposal.

The goal is to identify lossless mappings and unresolved decisions before a Response Adapter is designed. This document does not approve either contract, promote the raw snapshot to a learner submission, or authorize runtime integration.

## 2. Fundamental distinction

The two structures serve different purposes:

- **Raw UI snapshot:** describes the current state of visible controls, including untouched/empty/value status, labels, selected display text, and source provenance. It is a test inspection artifact.
- **Canonical learner response:** represents one submitted learner response, keyed by approved task/part identities, with a unique response ID and immutable submitted values. It is intended to be the input to evaluation.

A raw snapshot is not a submission event. It has no submit boundary, response ID, learner/device identity, or event linkage.

## 3. Field-level comparison

| Raw UI snapshot | Canonical response proposal | Reconciliation |
|---|---|---|
| `sourcePackage.packageId` | no direct field; `taskId` identifies a task | Package identity remains provenance/configuration. A task ID mapping must be explicitly approved. |
| `sourcePackage.contentVersion` | `contentVersion` | Value is `v1.0.2-draft`, matching the existing package profile. |
| `exerciseId` | candidate input to `taskId` | Do not equate them until the task-ID convention is approved. |
| `sourceDocument`, `sourceHeading` | no direct canonical field | Useful provenance for test evidence; may remain outside the canonical learner response. |
| `responses[].responseUnitId` | key in `response` object | Candidate stable part key only after the Manifest IDs and semantic mapping are approved. |
| `responses[].rawValue` | value under an approved part key | Lossless for text controls. For choice/matching, current rawValue is an option ID rather than learner-authored text. |
| `responses[].selectedOptionId` | CHOICE `{ selectedOptionId }`; matching right-side ID | Useful source identity; conversion differs by task mode. |
| `responses[].matchingLeftItemId` | MATCHING left-side key | Candidate mapping input. Canonical MATCHING expects stable left IDs mapped to stable right IDs. |
| `responses[].displayText` | no direct canonical field | Presentation metadata only; do not use as identity or evaluator input where a stable ID exists. |
| `responses[].label` | no direct canonical field | Presentation metadata only; never promote to a part ID. |
| `responses[].status` | no direct field | Must inform validation/incomplete-response handling, not correctness. |
| `captureType`, `schemaVersion` | `responseSchemaVersion` | Separate schema namespaces. A raw snapshot version is not the canonical response schema version. |
| no field | `responseId` | Missing until a real submit/attempt boundary is designed. Do not invent it during snapshot capture. |

## 4. Candidate lossless mappings by response mode

These are mapping candidates, not approved serialization rules.

### CHOICE

Current snapshot carries `selectedOptionId` and display text separately. The canonical proposal expects an object such as `{ selectedOptionId }`. A future adapter could construct that value after confirming that the option ID resolves uniquely in the exact content version.

### BLANKS and text fields

Current text-control `rawValue` can be transferred unchanged to a canonical part key. Do not trim, lowercase, remove punctuation, or reconstruct a sentence. The approved mapping must confirm that the response-unit ID is the correct semantic part ID.

### MULTI_PART and TRANSFORM

The current renderer preserves one value per configured control. Full corrected sentences and full transformed sentences remain strings. The semantic mapping must determine whether the controls are separate assessed parts or a presentation-only grouping.

### MATCHING

Current controls record a stable left item ID and selected right option ID. A future adapter may convert these records into the canonical left-ID → right-ID mapping. It must reject duplicate/unknown endpoint IDs and must not depend on displayed order.

### OPEN_RESPONSE

The full text is preserved. A future canonical envelope may carry it unchanged, but the absence of an authored deterministic rubric still means `REVIEW_REQUIRED`; the renderer must not infer a score.

### True/False decisions

The current raw value is the literal source label `True` or `False`. The canonical semantic mapping must explicitly define how this response is represented. Do not create synthetic option IDs unless the content contract explicitly adds them.

## 5. Blocking gaps before canonical response approval

1. **Task identity:** decide whether the canonical `taskId` is the source exercise ID or a separate stable identifier. No silent equivalence.
2. **Response ID and submission lifecycle:** define when a response is submitted and how a unique `responseId` is created. Current snapshots are live observations only.
3. **Stable part IDs:** approve which Manifest response-unit IDs are valid canonical part IDs. Manifest status is still draft.
4. **Control grouping:** approve or revise the provisional per-exercise layouts. In particular A8, B7, C6, D3, D4 and D6 need explicit review; other renderer choices are disclosed in the page.
5. **Matching serialization:** approve how A2 and C3 become left-ID → right-ID mappings.
6. **Choice serialization:** confirm that A7, B1 Part 1 and C1 use the source-labelled option IDs as canonical option IDs.
7. **Empty vs missing:** define whether untouched controls are omitted, explicit empty strings are submitted, or the envelope is marked incomplete. The current raw status is not a correctness outcome.
8. **Multi-part requirements:** define behavior when only some fields have values, especially B1, D6, D8, and multi-blank tasks.
9. **Open-response granularity:** decide whether A8's four prompts are four canonical parts or one complete response; keep B8/C8/D7 as full open responses unless an approved content mapping says otherwise.
10. **Version consistency:** use the package profile's exact content version string `v1.0.2-draft`. The UI Manifest was aligned to this value.

## 6. Required fail-closed behavior for a future adapter

Once approved, a separate adapter should:
- validate package/task/version identity before mapping;
- reject unknown response-unit and option IDs;
- preserve raw values without mutation;
- distinguish missing fields from explicitly empty values;
- reject duplicate matching endpoints or malformed matching maps;
- never infer correctness, diagnostics, feedback, recovery, phases, or completion;
- never accept a UI-supplied `correct`, axis outcome, or mastery value;
- produce a canonical response only at an explicit submission boundary.

These are design requirements for a future adapter, not current implementation behavior.

## 7. Decision and next step

**Decision:** retain the raw UI snapshot as a separate test-only contract. Do not treat it as the canonical Learner Response Contract.

**Next step:** review and approve the response-unit/control grouping decisions in the UI Manifest and renderer. Then revise the canonical response contract with exact TO BE A1 task/part/option IDs and submission semantics. Only after that approval may a response adapter be implemented.
