# TO BE A1 Set A Answer Mapping v0.1-draft

Status: source-grounded mapping draft; not learner-deliverable.
Package: TO_BE_A1_FULL_CONTENT_LIBRARY_v1.0.2-draft
Set: A (A1–A8)
Source: `SET_A_EXERCISES_AND_ANSWER_FEEDBACK.md` (exercise headings A1–A8), plus `DIAGNOSTIC_TAXONOMY_AND_RECOVERY_MAP.md`.
Target branch: `feat/persistence-adapter-test-double`

## 1. Mapping principles

- Expected answers and alternatives below follow the unchanged v1.0.2-draft source.
- Normalization is enabled only where the source explicitly allows it.
- The evaluator compares only the declared response fields. Unrelated spelling outside an answer blank is not part of that blank's score.
- Diagnostic rules below match only explicitly listed source examples/conditions. Other incorrect answers remain `NO_DIAGNOSTIC`; there is no fallback diagnosis.
- A diagnostic never changes correctness. Context comprehension and factual accuracy remain distinct from target grammar.
- Runtime part serialization, hypothesis IDs, phase compatibility, and criterion-level feedback/recovery links must be resolved before delivery.

## 2. Exercise mappings

### A1 — Choose the correct form

Source prompt: choose am/is/are for five sentence blanks.

| Part | Expected | Source-authorized diagnostic evidence |
|---|---|---|
| blank_1 (I) | `am` | `FORM_AM`: oneOf `is`, `are` |
| blank_2 (She) | `is` | `FORM_IS`: equals `are` |
| blank_3 (They) | `are` | `FORM_ARE`: equals `is` |
| blank_4 (We) | `are` | `FORM_ARE`: equals `is` |
| blank_5 (He) | `is` | `FORM_IS`: equals `are` |

- Accepted alternatives: only the correct target form for each corresponding blank.
- Normalization: `caseInsensitive: true` and `ignorePunctuation: true`, explicitly authorized by A1 Accepted Alternatives and Editorial note.
- Diagnostic conditions: exact wrong-form values above only. They are not catch-all rules for arbitrary strings.
- Status: `MAPPING_DRAFT`.
- Unresolved: confirm the actual UI response paths; confirm that the UI submits one isolated form value per blank; resolve approved hypothesis/phase IDs and criterion-level feedback/recovery refs.

### A2 — Match people and descriptions

- Proposed mode: `MATCHING`; four pairings:
  - Emma → b (She is a student)
  - Daniel → d (He is a teacher)
  - Anna and Mark → c (They are at an English course)
  - You and I → a (We are friends)
- Accepted alternatives: the same four correct matches regardless of display order; the source also states the equivalent pronoun mapping (Emma→She, Daniel→He, Anna and Mark→They, You and I→We).
- Normalization: none authorized.
- Diagnostics: taxonomy names SUBJECT_MAPPING, FORM_IS and FORM_ARE, but the actual learner response representation must be known before a wrong pair can be attributed to a specific pronoun/form error. No executable rules yet.
- Status: `MAPPING_DRAFT`.
- Unresolved: confirm whether Runtime stores keyed pairs or an array of pairs; if array, use unordered comparison only because source explicitly says display order is irrelevant; resolve hypothesis/phase and feedback/recovery refs.

### A3 — Complete the sentences

| Part | Expected | Source-authorized diagnostic evidence |
|---|---|---|
| blank_1 (I) | `am` | `FORM_AM`: oneOf `is`, `are` |
| blank_2 (My name) | `is` | `FORM_IS`: equals `are` |
| blank_3 (You) | `are` | `FORM_ARE`: equals `is` |
| blank_4 (It) | `is` | `FORM_IS`: equals `are` |
| blank_5 (We) | `are` | `FORM_ARE`: equals `is` |
| blank_6 (Tom and Anna) | `are` | `FORM_ARE`: equals `is` |

- Accepted alternatives: only the target form in each blank.
- Normalization: none added; unlike A1, this exercise does not explicitly authorize case/punctuation normalization. The evaluator checks only blank values, so spelling elsewhere in the sentence is outside this score.
- Diagnostic conditions: only the specific wrong forms listed above. Other wrong inputs do not receive an inferred Error Pattern.
- Status: `MAPPING_DRAFT`.
- Unresolved: confirm response paths and interface case behavior; resolve hypothesis/phase and criterion-level feedback/recovery refs.

### A4 — Find the incorrect form

- Proposed mode: `MULTI_PART`, four independently scored corrected sentences.
- Expected:
  1. `I am Alex.`
  2. `She is a student.`
  3. `They are from Spain.`
  4. `We are friends.`
- Accepted alternatives: source permits minor punctuation/capitalization differences. It also permits accepting the exact corrected form replacement if the interface does not require a full rewrite; these are different response shapes and must not be mixed into one descriptor until the UI mode is confirmed.
- Normalization for full-sentence responses: `caseInsensitive: true`, `ignorePunctuation: true`.
- Source-backed diagnostic examples:
  - sentence_1: `FORM_AM` when the raw sentence is `I is Alex.`
  - sentence_2: `FORM_IS` when the raw sentence is `She are a student.`
  - sentence_3: `FORM_ARE` when the raw sentence is `They is from Spain.`
  - sentence_4: `FORM_ARE` when the raw sentence is `We is friends.`
  These are exact source examples only; other errors remain undiagnosed.
- Status: `MAPPING_DRAFT`.
- Unresolved: confirm full-sentence vs form-only response shape; resolve hypothesis/phase and criterion-level feedback/recovery refs.

### A5 — Read and decide: True or False

- Proposed mode: `MULTI_PART`; three independent decisions.
- Expected: `True`, `False`, `True`.
- Accepted alternatives: `T`/`F` only if the learner interface explicitly supports them.
- Normalization: none authorized.
- Diagnostic conditions: the source explicitly defines an incorrect True/False decision as `CONTEXT_UNDERSTANDING`. Because each part has a closed two-value answer domain and its own key, the wrong option can be mapped exactly:
  - decision_1: `False` → `CONTEXT_UNDERSTANDING`
  - decision_2: `True` → `CONTEXT_UNDERSTANDING`
  - decision_3: `False` → `CONTEXT_UNDERSTANDING`
  Scope: `OUTSIDE_TARGET`. This is a context-comprehension error, not evidence of negative-sentence construction.
- Status: `MAPPING_DRAFT`.
- Unresolved: confirm UI tokens and response paths; resolve hypothesis/phase and criterion-level feedback/recovery refs.

### A6 — Build the sentence

- Proposed mode: `MULTI_PART`, four ordered sentence constructions.
- Expected:
  1. `I am Alex.`
  2. `She is a student.`
  3. `They are friends.`
  4. `We are from Poland.`
- Accepted alternatives: same grammatical word order; harmless punctuation/capitalization differences are allowed. Different subject–be agreement and different word order are not accepted.
- Normalization: `caseInsensitive: true`, `ignorePunctuation: true`.
- Diagnostics: source names WORD_ORDER and form-specific Error Patterns, but does not provide complete raw-response conditions for every malformed construction. Do not infer them from labels alone.
- Status: `MAPPING_DRAFT`.
- Unresolved: confirm ordered token array vs final sentence string; resolve hypothesis/phase and criterion-level feedback/recovery refs.

### A7 — Choose the correct description

- Proposed mode: `CHOICE`; expected option `A`.
- Option A matches both facts; B and C do not.
- Accepted alternatives: complete equivalent description only if the interface allows free-text responses.
- Normalization: none authorized; free-text equivalent requires a separate response descriptor.
- Diagnostics: source names `CONTEXT_UNDERSTANDING` (wrong profile interpretation) and `CONTEXT_ACCURACY` (grammatical description contradicts profile). It does not unambiguously assign each incorrect option to one non-overlapping condition. Do not emit either tag until that overlap is resolved.
- Status: `MAPPING_DRAFT` for choice evaluation; diagnostic mapping unresolved.
- Unresolved: verify rendered option IDs; resolve the two context-tag boundaries, hypothesis/phase and feedback/recovery refs.

### A8 — Make it personal

- Mode: `OPEN_RESPONSE`; learner writes four personal/invented sentences using the four prompts.
- Expected answer: any four grammatical, meaningful sentences satisfying the prompts.
- Accepted alternatives: varied truthful or invented details; contractions where grammatically appropriate.
- Diagnostics in source: FORM_IS, FORM_AM, ARTICLE_USAGE. Article usage is explicitly separate from target `to be` grammar.
- Runtime: no deterministic full-response rubric is authored or supported. Keep `REVIEW_REQUIRED`; preserve raw response. Do not automatically grade the whole response.
- Status: `REVIEW_REQUIRED`.

## 3. Diagnostic mapping constraints

- A1/A3: use only the listed form-specific wrong values; no diagnostic for arbitrary unexpected strings.
- A4: exact source example conditions only; punctuation/capitalization normalization applies consistently to both evaluation and diagnostic matching.
- A5: context-comprehension diagnostics are separate from grammar accuracy.
- A2/A6/A7: do not infer a tag when the response shape or source boundary is ambiguous.
- A8: remain open-response review; do not infer a deterministic rubric from example phrases.
- A correct part never receives an error diagnostic. If an incorrect part has no matching authored condition, return `NO_DIAGNOSTIC`.

## 4. Runtime compatibility findings

- Evaluator response lookup is `response[part.responsePath ?? part.partId]`; each exercise therefore needs stable part IDs and explicit response paths matching the UI payload.
- Evaluator supports exact values, multiple accepted values, ordered arrays, and explicitly unordered arrays. A2's order independence can be represented by keyed pairs or an authored unordered array, but the UI serialization must be confirmed first.
- Evaluator supports case-insensitive comparison, but originally did not support punctuation-insensitive comparison. A source-authorized `ignorePunctuation` normalization has now been added to evaluator and diagnostic classifier; tests cover punctuation and capitalization without relaxing word order or be-form agreement.
- Evaluator does not accept multiple alternative response shapes in one part. A4's full-sentence vs form-only answer mode must be selected by the UI/task descriptor.
- OPEN_RESPONSE returns REVIEW_REQUIRED.

## 5. Set A readiness

| Exercise | Evaluation status | Diagnostic status | Mapping status |
|---|---|---|---|
| A1 | Deterministic answer key; source-authorized normalization | Specific form errors mapped | MAPPING_DRAFT |
| A2 | Answer key known; response serialization unresolved | Not executable yet | MAPPING_DRAFT |
| A3 | Deterministic answer key | Specific form errors mapped | MAPPING_DRAFT |
| A4 | Deterministic full-sentence option; response mode unresolved | Exact source examples mapped | MAPPING_DRAFT |
| A5 | Deterministic comprehension key | Context error mapped to wrong finite option | MAPPING_DRAFT |
| A6 | Deterministic sentence key | No safe complete diagnostic mapping | MAPPING_DRAFT |
| A7 | Deterministic choice key | Context-tag overlap unresolved | MAPPING_DRAFT |
| A8 | No automatic scoring | Review only | REVIEW_REQUIRED |

## 6. Gates before Set A validation

1. Confirm actual UI response payloads/paths for A1–A7.
2. Confirm A4 full rewrite vs form-only mode and A2 matching serialization.
3. Resolve approved hypothesis IDs and phase compatibility.
4. Resolve A7 CONTEXT_UNDERSTANDING vs CONTEXT_ACCURACY overlap.
5. Link each part to exact authored feedback/recovery criteria.
6. Run the new Set A evaluator/classifier tests and the existing Core Lab suites.
7. Keep A8 in REVIEW_REQUIRED.

## 7. Change control

This is a Core Lab mapping artifact only. It does not modify the Content Library ZIP or its Markdown sources, Content Library decisions, production, or `main`.
