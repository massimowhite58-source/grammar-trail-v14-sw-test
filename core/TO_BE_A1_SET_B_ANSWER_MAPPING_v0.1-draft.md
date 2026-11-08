# TO BE A1 Set B Answer Mapping v0.1-draft

Status: source-grounded mapping draft; not learner-deliverable.
Package: TO_BE_A1_FULL_CONTENT_LIBRARY_v1.0.2-draft
Set: B (B1–B8)
Source: `SET_B_EXERCISES_AND_ANSWER_FEEDBACK.md` (exercise headings B1–B8), plus `DIAGNOSTIC_TAXONOMY_AND_RECOVERY_MAP.md`.
Target branch: `feat/persistence-adapter-test-double`

## 1. Mapping principles

- Expected answers and accepted alternatives follow the unchanged v1.0.2-draft source.
- No case, punctuation, whitespace, or spelling normalization is assumed unless explicitly stated by the source.
- Full and contracted forms are accepted only where the exercise explicitly allows both.
- Grammar correctness, instruction compliance, context comprehension, factual accuracy, and communication completion remain separate dimensions.
- Diagnostic conditions match only exact source-authored examples/criteria. Broad phrases such as “malformed” do not become catch-all rules.
- B7 and B8 remain open response; sample answers are not deterministic rubrics.
- Runtime response paths, hypothesis IDs, phase compatibility, and criterion-level feedback/recovery links remain required before delivery.

## 2. Exercise mappings

### B1 — Choose and complete: affirmative or negative

- Proposed mode: `MULTI_PART`; one exercise with two independently scored parts.
- Part 1 expected: option `B` only (`She is not a student.`).
- Part 2 expected: `aren't` or `are not`.
- Accepted alternatives:
  - Part 1: only option B.
  - Part 2: both authored forms, `aren't` and `are not`.
- Normalization: none authorized.
- Source-backed diagnostic conditions:
  - Part 1 option `A` (sentence “She not is a student.”) → `NEGATION_PLACEMENT`.
  - Part 1 option `C` (sentence “She are not a student.”) → `FORM_IS`.
  - Part 2 exact response `They isn't` → `NEGATIVE_FORM_ARE`.
- The option-to-diagnostic mapping is valid only if the UI submits the stable option identifier and those identifiers are confirmed to correspond to the authored option texts.
- Status: `MAPPING_DRAFT`.
- Unresolved: verify option IDs and part response paths; confirm part 2 is a single blank; resolve hypothesis/phase and feedback/recovery refs.

### B2 — Make the sentence negative

- Proposed mode: `TRANSFORM`; one response part.
- Expected: `They are not teachers.`
- Accepted alternative: `They aren't teachers.`
- Normalization: none authorized.
- Source-backed exact diagnostic examples:
  - `They are teachers.` unchanged → `NEGATIVE_CONSTRUCTION`.
  - `They not are teachers.` → `NEGATION_PLACEMENT`.
  - `They is not teachers.` → `FORM_ARE`.
- The source also mentions “malformed” negative constructions generally. That wording is not an exhaustive response set; no catch-all diagnostic is created for other malformed strings.
- Status: `MAPPING_DRAFT`.
- Unresolved: confirm whether evaluator TRANSFORM supports both full and contracted accepted values as one response part; resolve hypothesis/phase and feedback/recovery refs.

### B3 — Complete the negative sentences

| Part | Subject context | Expected | Source-backed diagnostic |
|---|---|---|---|
| blank_1 | I | `am` | `FORM_AM` when value is `is` |
| blank_2 | My brother | `is` | `FORM_IS` when value is `are` |
| blank_3 | We | `are` | `FORM_ARE` when value is `is` |
| blank_4 | Emma and Lisa | `are` | `FORM_ARE` when value is `is` |
| blank_5 | My parents | `are` | `FORM_ARE` when value is `is` |

- Accepted alternatives: only `am`, `is`, or `are` in the corresponding blank.
- Important response constraint: the blank precedes `not`; the source explicitly says the full be-form is required here. Do not accept contractions such as `aren't` in this blank format.
- Normalization: none authorized.
- Diagnostic conditions: only the specific wrong forms listed above. Other inputs remain undiagnosed.
- Status: `MAPPING_DRAFT`.
- Unresolved: confirm the UI sends only the blank value; resolve hypothesis/phase and feedback/recovery refs.

### B4 — Find and correct the mistakes

- Proposed mode: `MULTI_PART`; three independently scored corrections.
- Expected:
  1. `He is not my brother.`
  2. `I am not a teacher.`
  3. `They aren't from Germany.` or `They are not from Germany.`
- Accepted alternatives: both full and contracted forms for item 3 only, as explicitly authored.
- Normalization: none authorized.
- Source-backed exact diagnostic examples:
  - correction_1: `He are not my brother.` → `FORM_IS`.
  - correction_2: `I is not a teacher.` → `FORM_AM`.
  - correction_3: `They isn't from Germany.` → `NEGATIVE_FORM_ARE`.
- These exact incorrect sentences are diagnostic examples, not a complete list of all possible errors.
- Status: `MAPPING_DRAFT`.
- Unresolved: confirm full-sentence correction response shape and stable part paths; resolve hypothesis/phase and feedback/recovery refs.

### B5 — Read and decide: True or False

- Proposed mode: `MULTI_PART`; three independent comprehension decisions.
- Expected: `False`, `True`, `False`.
- Accepted alternatives: `T`/`F` only if the interface explicitly supports these abbreviations.
- Normalization: none authorized.
- Diagnostic condition: source defines `CONTEXT_UNDERSTANDING` for incorrect text interpretation. For the finite True/False response domain:
  - decision_1: `True` → `CONTEXT_UNDERSTANDING`.
  - decision_2: `False` → `CONTEXT_UNDERSTANDING`.
  - decision_3: `True` → `CONTEXT_UNDERSTANDING`.
- Scope: `OUTSIDE_TARGET`. This is comprehension only, not evidence that the learner can or cannot construct a negative.
- Status: `MAPPING_DRAFT`.
- Unresolved: confirm UI tokens/paths; resolve hypothesis/phase and feedback/recovery refs.

### B6 — Change full forms into short forms

- Proposed mode: `MULTI_PART`; three independent transformations.
- Expected:
  1. `He isn't a teacher.`
  2. `They aren't at home.`
  3. `I'm not from Italy.`
- Accepted alternatives: only the standard short forms requested by the task. Full forms are grammatical but do not satisfy this transformation instruction. `I amn't` is not accepted as standard.
- Normalization: none authorized.
- Source-backed diagnostic conditions:
  - The corresponding full-form answers (`He is not a teacher.`, `They are not at home.`, `I am not from Italy.`) → `INSTRUCTION_FOLLOWING`, not a grammar error. These conditions apply only if the UI returns the full sentence as the part response.
  - Exact non-standard form `I amn't from Italy.` → `NEGATIVE_CONTRACTION`.
- Other incorrect contraction spellings are not diagnosed unless an exact authored criterion is added.
- Status: `MAPPING_DRAFT`.
- Unresolved: confirm response granularity (full sentence vs contracted token); confirm whether the evaluator can preserve a correct grammar axis while marking instruction compliance separately; resolve hypothesis/phase and feedback/recovery refs.

### B7 — Describe Maria and John

- Source expected example: `Maria is a colleague. John is a friend. They are not relatives.`
- Accepted alternatives: equivalent sentences preserving all three facts, including `Maria and John are not relatives` or `They aren't relatives` for the final fact.
- Source Error Patterns include FORM_IS, FORM_ARE, NEGATIVE_CONSTRUCTION, and CONTEXT_ACCURACY with examples. These are useful review references, but the response is open-ended and the source does not provide a finite deterministic rubric covering all equivalent phrasing.
- Runtime: `OPEN_RESPONSE` → `REVIEW_REQUIRED`; preserve raw response. Do not automatically score the whole response or infer a tag from a partial sample.
- Status: `REVIEW_REQUIRED`.

### B8 — Tell me about yourself

- Source requirement: at least three sentences covering name, origin, role (e.g. student/worker), and one other detail.
- Expected answer: any three or more meaningful sentences with correct be-forms.
- Accepted alternatives: varied personal or invented details; a negative sentence is not required.
- Source Error Patterns include FORM_IS, FORM_AM, ARTICLE_USAGE, and COMMUNICATION_COMPLETION (fewer than three sentences).
- Runtime: `OPEN_RESPONSE` → `REVIEW_REQUIRED`; no deterministic rubric is supplied. ARTICLE_USAGE must remain separate from target `to be` form scoring. Do not infer an automatic score from example errors or sentence count alone.
- Status: `REVIEW_REQUIRED`.

## 3. Diagnostic mapping constraints

- B1: map the selected authored option to its exact source error only after UI option IDs are verified.
- B2/B4: use only exact incorrect examples stated in the source. “Malformed” is not a condition.
- B3: map only the source-listed form substitutions for the relevant subject/blank.
- B5: classify only the wrong finite True/False choice as CONTEXT_UNDERSTANDING; never as negative-construction skill.
- B6: distinguish a grammatical full form that violates the contraction instruction from an actually non-standard contraction. Do not alter grammar correctness.
- B7/B8: open response; retain review-required behavior. Do not turn the examples into an exhaustive rubric.
- A correct evaluator result never receives an error diagnostic. An incorrect response with no matching exact condition returns `NO_DIAGNOSTIC`.

## 4. Runtime compatibility findings

- Evaluator reads `response[part.responsePath ?? part.partId]`; part IDs and response paths must match the actual UI payload.
- MULTI_PART supports independent part outcomes within one exercise. B1 must remain one exercise with two parts.
- TRANSFORM and MULTI_PART can compare multiple accepted values for a part. B2 can therefore carry full and contracted accepted forms.
- B6 requires separate grammar and instruction-compliance dimensions. Current evaluator returns only answer correctness; it cannot independently report “grammatically correct but instruction not followed” as two axes without an additional scoring descriptor/axis.
- OPEN_RESPONSE remains REVIEW_REQUIRED without an explicit supported rubric.

## 5. Set B readiness

| Exercise | Answer mapping | Diagnostic status | Mapping status |
|---|---|---|---|
| B1 | Two parts; B and aren't/are not | Exact source examples; UI option IDs pending | MAPPING_DRAFT |
| B2 | They are not / They aren't teachers | Exact examples only | MAPPING_DRAFT |
| B3 | Five full be-form blanks | Specific form substitutions | MAPPING_DRAFT |
| B4 | Three corrections; item 3 has two accepted forms | Exact examples only | MAPPING_DRAFT |
| B5 | False / True / False | Context-understanding wrong options | MAPPING_DRAFT |
| B6 | Three standard contractions | Instruction-following vs contraction error; two-axis support pending | MAPPING_DRAFT |
| B7 | Open production | Review only | REVIEW_REQUIRED |
| B8 | Open production, at least three sentences | Review only | REVIEW_REQUIRED |

## 6. Gates before Set B validation

1. Confirm UI response payloads and stable part/option IDs.
2. Resolve B6 dual-axis scoring so instruction compliance does not overwrite grammar correctness.
3. Resolve approved hypothesis IDs and phase compatibility.
4. Link each deterministic part to exact authored feedback/recovery criteria.
5. Add source-derived evaluator/classifier tests for B1–B6; keep B7/B8 review-required.
6. Run all Core Lab suites against the exact mapping commit.

## 7. Change control

This is a Core Lab mapping artifact only. It does not modify the Content Library ZIP or its Markdown sources, Content Library decisions, production, or `main`.
