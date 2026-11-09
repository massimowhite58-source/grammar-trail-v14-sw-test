# TO BE A1 Raw UI Capture Contract v0.1-draft

**Status:** Observed browser payload contract; draft only.  
**Source package:** `TO_BE_A1_FULL_CONTENT_LIBRARY_v1.0.2-draft`  
**Renderer:** `core/to-be-a1-lab.html`  
**Structural identities:** `core/TO_BE_A1_UI_MANIFEST_v0.1-draft.md`  
**Browser evidence:** `core/TO_BE_A1_LAB_RENDERER_TEST_REPORT_v0.1.md`

## 1. Purpose and strict boundary

This document describes the raw snapshot emitted by the isolated TO BE A1 Lab controls. It records what the browser UI currently exposes, before any normalization or semantic interpretation.

It is **not** the canonical learner response envelope and does not authorize a Response Adapter, Answer Evaluator, Diagnostic Classifier, Learning Core, event store, or durable persistence integration.

The contract is observational: if the renderer changes, this contract and its browser tests must be reviewed together.

## 2. Top-level payload

The current renderer exposes this shape in the raw inspector:

```json
{
  "captureType": "RAW_UI_SNAPSHOT",
  "schemaVersion": "to-be-a1-raw-ui-capture-v0.1",
  "sourcePackage": {
    "packageId": "TO_BE_A1_FULL_CONTENT_LIBRARY",
    "contentVersion": "v1.0.2-draft"
  },
  "sourceDocument": "SET_A_EXERCISES_AND_ANSWER_FEEDBACK.md",
  "exerciseId": "A1",
  "sourceHeading": "A1 — Choose the correct form",
  "responses": []
}
```

The package ID and version are taken from the existing TO BE A1 package profile. The source document and exercise heading identify the prompt provenance.

## 3. Response record

Every configured UI control is represented by one response record:

```json
{
  "responseUnitId": "A1.r01",
  "label": "Blank 1 — I __ Alex",
  "status": "VALUE",
  "rawValue": " am "
}
```

Fields:

| Field | Meaning |
|---|---|
| `responseUnitId` | Stable response-unit ID from the UI Manifest, including explicit part/subcomponent IDs where applicable |
| `label` | Visible renderer label for the control; descriptive UI text, not a semantic skill or answer |
| `status` | `NOT_TOUCHED`, `EMPTY`, or `VALUE` |
| `rawValue` | Exact current value emitted by the control; no trimming, case folding, punctuation removal, or answer normalization |

Status rules:
- `NOT_TOUCHED`: the learner has not changed this control during the current in-memory page session.
- `EMPTY`: the learner interacted with the control and its current value is empty.
- `VALUE`: the control currently has a non-empty value.

The snapshot includes all configured controls, including untouched controls. A cleared control remains `EMPTY` until the exercise is explicitly reset. Reset deletes only that exercise's in-memory values; the controls then return to `NOT_TOUCHED`.

## 4. Choice and matching metadata

Where the control represents a source-labelled choice or a matching endpoint, the record may also include:

- `selectedOptionId`: stable option ID selected by the learner; null when no option is selected.
- `displayText`: the visible source option text associated with the selected ID; null when no option is selected.
- `matchingLeftItemId`: source-backed left-side matching item ID for matching controls.
- `optionIdentity`: currently `SOURCE_LABEL_ONLY` for True/False controls, because the UI Manifest does not define synthetic True/False option IDs.

Example matching record:

```json
{
  "responseUnitId": "A2.r01",
  "label": "Emma",
  "status": "VALUE",
  "rawValue": "A2.right.c",
  "selectedOptionId": "A2.right.c",
  "displayText": "c) They are at an English course.",
  "matchingLeftItemId": "A2.left.01"
}
```

For CHOICE and MATCHING, `rawValue` is the selected stable option ID. `displayText` preserves the associated visible option text separately. For True/False, `rawValue` is the literal selected source label (`True` or `False`); no stable option ID is invented.

## 5. Raw-value preservation

The renderer and this snapshot contract preserve:
- leading and trailing spaces in text controls;
- letter case;
- punctuation;
- internal whitespace and line breaks;
- explicit empty values;
- selected stable option IDs separately from their display text.

The renderer does not:
- trim or normalize learner text;
- decide whether a response is correct;
- map a response to an error pattern;
- infer a missing answer;
- assign a learning phase or hypothesis;
- calculate task completion, mastery, or progress.

## 6. Session and lifecycle

- The payload is a snapshot of the currently displayed exercise.
- The renderer stores values only in a JavaScript in-memory `Map`.
- Navigating between exercises preserves values until the page is reloaded or the user clears that exercise.
- Reloading the page starts a new empty session.
- No localStorage, IndexedDB, network request, or server persistence is used by this renderer.
- The snapshot has no submission timestamp, learner identity, device identity, attempt ID, or durable event ID. These are intentionally outside this observational UI contract.

## 7. Known limitations

1. The `label` field is presentation metadata; it must not become a response identity.
2. Renderer-defined slots in B7, C6, and D3 are not source-authored field identifiers. Their grouping requires review before canonical response-envelope approval.
3. Other per-exercise control groupings are explicitly labelled in the renderer as provisional choices.
4. `NOT_TOUCHED` and `EMPTY` describe UI interaction state only. They are not evaluator outcomes.
5. A snapshot is not a learner submission event. The UI currently has no submit/attempt lifecycle.
6. The browser test does not yet compare all embedded prompt strings byte-for-byte against the external source archive.

## 8. Next approval gate

Review this observed payload against:
- the source exercise layout and UI Manifest;
- `core/TO_BE_A1_LEARNER_RESPONSE_CONTRACT_v0.1-draft.md`;
- the real intended UI control grouping for exercises with provisional renderer slots.

Only after that review should a separate canonical learner-response contract be approved. The Response Adapter must not be implemented by silently promoting this test snapshot into a learner event.
