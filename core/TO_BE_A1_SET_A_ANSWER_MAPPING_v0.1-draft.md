# TO BE A1 Set A Answer Mapping v0.1-draft

Status: source-grounded answer mapping draft; not executable and not learner-deliverable.
Package: TO_BE_A1_FULL_CONTENT_LIBRARY_v1.0.2-draft
Set: A (A1–A8)
Source documents:
- `SET_A_EXERCISES_AND_ANSWER_FEEDBACK.md`
- `DIAGNOSTIC_TAXONOMY_AND_RECOVERY_MAP.md`
Target branch: `feat/persistence-adapter-test-double`

## 1. Mapping rules applied

- Expected answers and alternatives below are transcribed from the authored Set A material.
- No answer normalization is enabled unless the source explicitly authorizes it. This draft does not establish trim, case-folding, punctuation removal, or whitespace normalization.
- Matching in A2 is order-independent because the source defines matching pairs, not a required display order.
- A5 is a comprehension task. A wrong decision is not evidence of inability to construct a negative sentence.
- A7 separates understanding the profile from factual accuracy.
- Error Pattern names and illustrative examples are not treated as exhaustive raw-response conditions. Therefore this draft contains no executable diagnostic conditions.
- Hypothesis IDs and learning-phase mappings remain unresolved.
- A8 remains open response and is not deterministically graded.

## 2. Exercise mappings

### A1 — Choose the correct form

- Proposed mode: `BLANKS`
- Proposed parts: `blank_1`–`blank_5`
- Source answer key:
  - blank_1: `am`
  - blank_2: `is`
  - blank_3: `are`
  - blank_4: `are`
  - blank_5: `is`
- Accepted alternatives: none authored for these blanks.
- Normalization: none authorized in this mapping.
- Diagnostic evidence: source lists FORM_AM, FORM_IS, FORM_ARE and examples such as incorrect subject–form pairings. These examples do not define exhaustive conditions; no executable diagnostic rule is created.
- Status: `MAPPING_DRAFT`
- Unresolved: confirm Runtime response paths; approved hypothesis ID and phase; criterion-level feedback/recovery references.

### A2 — Match people and descriptions

- Proposed mode: `MATCHING`
- Proposed parts: `match_1`–`match_4`
- Canonical answer pairs:
  - Emma → b
  - Daniel → d
  - Anna and Mark → c
  - You and I → a
- Accepted alternatives: the same four pairs in any display/order sequence. This is an order-independent set of pairings, not permission to change pair membership.
- Normalization: none authorized. Matching identifiers must correspond to the authored options.
- Diagnostic evidence: SUBJECT_MAPPING, FORM_IS, FORM_ARE are named in the source, but no exhaustive response-to-error conditions are established here.
- Status: `MAPPING_DRAFT`
- Unresolved: confirm Runtime MATCHING serialization and whether it stores keyed pairs or an array; approved hypothesis ID and phase; criterion-level feedback/recovery references.

### A3 — Complete the sentences

- Proposed mode: `BLANKS`
- Proposed parts: `blank_1`–`blank_6`
- Source answer key:
  - blank_1: `am`
  - blank_2: `is`
  - blank_3: `are`
  - blank_4: `is`
  - blank_5: `are`
  - blank_6: `are`
- Accepted alternatives: none authored for these blanks.
- Normalization: none authorized in this mapping.
- Diagnostic evidence: FORM_AM, FORM_IS, FORM_ARE are named, but illustrative error examples are not promoted to catch-all rules.
- Status: `MAPPING_DRAFT`
- Unresolved: confirm Runtime response paths; approved hypothesis ID and phase; criterion-level feedback/recovery references.

### A4 — Find the incorrect form

- Proposed mode: `MULTI_PART`
- Proposed parts: `sentence_1`–`sentence_4`
- Source answer key:
  - sentence_1: `I am Alex.`
  - sentence_2: `She is a student.`
  - sentence_3: `They are from Spain.`
  - sentence_4: `We are friends.`
- Accepted alternatives: none explicitly listed for these corrected sentences in the mapping source.
- Normalization: none authorized. Do not silently ignore punctuation, capitalization, or internal whitespace.
- Diagnostic evidence: FORM_AM, FORM_IS, FORM_ARE and word-order-related labels occur in the authored taxonomy. This draft does not infer a raw-response predicate from those labels.
- Status: `MAPPING_DRAFT`
- Unresolved: confirm whether the learner submits one corrected sentence per part and whether evaluator TRANSFORM/MULTI_PART semantics support exact full-sentence comparison; approved hypothesis ID and phase; criterion-level feedback/recovery references.

### A5 — Read and decide: True or False

- Proposed mode: `MULTI_PART`
- Proposed parts: `decision_1`–`decision_3`
- Source answer key:
  - decision_1: `True`
  - decision_2: `False`
  - decision_3: `True`
- Accepted alternatives: `T`/`F` only if the actual learner interface explicitly presents or accepts those tokens. This is an interface-dependent option, not an unconditional authored alternative.
- Normalization: none authorized. Do not assume case-insensitivity or accept translated labels.
- Diagnostic evidence: this task tests reading/context comprehension. A wrong True/False response must not create a diagnostic for negative-sentence construction.
- Status: `MAPPING_DRAFT`
- Unresolved: confirm UI answer tokens and serialization; define separate context-comprehension outcome handling if supported; approved hypothesis ID and phase; criterion-level feedback/recovery references.

### A6 — Build the sentence

- Proposed mode: `MULTI_PART`
- Proposed parts: `sentence_1`–`sentence_4`
- Source answer key:
  - sentence_1: `I am Alex.`
  - sentence_2: `She is a student.`
  - sentence_3: `They are friends.`
  - sentence_4: `We are from Poland.`
- Accepted alternatives: none explicitly listed for these word-order constructions in the mapping source.
- Normalization: none authorized. Word order is material; do not sort tokens or normalize into a different sequence.
- Diagnostic evidence: source taxonomy includes WORD_ORDER and form-specific tags. No exhaustive raw-response conditions are established by the labels alone.
- Status: `MAPPING_DRAFT`
- Unresolved: confirm whether Runtime receives ordered token arrays or final sentence strings; approved hypothesis ID and phase; criterion-level feedback/recovery references.

### A7 — Choose the correct description

- Proposed mode: `CHOICE`
- Proposed response part: `choice`
- Source answer key: `A`
- Accepted alternatives: none authored beyond the keyed choice.
- Normalization: none authorized. The response token must match the actual option identifier.
- Diagnostic evidence: keep profile understanding separate from factual accuracy. Do not diagnose a grammar-form error from a wrong profile/comprehension choice.
- Status: `MAPPING_DRAFT`
- Unresolved: confirm option IDs in the rendered content; determine whether factual accuracy is separately represented by the task data; approved hypothesis ID and phase; criterion-level feedback/recovery references.

### A8 — Make it personal

- Proposed mode: `OPEN_RESPONSE`
- Proposed response part: `response`
- Source requirement: learner produces four personal sentences.
- Expected answer: no single expected answer.
- Accepted alternatives: truthful or invented personal details are permitted by the source; this is not a finite accepted-answer list.
- Normalization: not applicable for automatic grading.
- Diagnostic evidence: ARTICLE_USAGE is separate from target `to be` grammar. The source does not provide a deterministic rubric that safely scores the full personal response.
- Status: `REVIEW_REQUIRED`
- Runtime behavior: do not return automatic correct/incorrect grammar scoring for the whole response. Preserve the raw response and request review.
- Unresolved: any future rubric requires explicit authorship and evaluator support; hypothesis/phase and criterion-level feedback/recovery references remain unresolved.

## 3. Set A diagnostic mapping decision

No executable diagnostic rules are authored in this draft.

Reason:
- The source provides Error Pattern labels and examples, but an example is not proof of a complete closed set of raw learner responses.
- A classifier rule such as `equals` could safely match a specific authored response only if the source explicitly defines that response as a diagnostic criterion for the relevant item/part. That linkage has not been established in this mapping.
- `notOneOf` is not used: the source has not established closed response domains for these exercises.
- No catch-all mapping is permitted.
- No diagnostic is emitted for a correct evaluator result.
- Context comprehension, factual accuracy, and target grammar must remain separate.

The absence of diagnostic rules does not mean the source Error Patterns are discarded. They remain authored taxonomy/reference material until exact item-level conditions are approved.

## 4. Set A readiness summary

| Exercise | Answer mapping | Automatic evaluation | Diagnostics | Status |
|---|---|---|---|---|
| A1 | Exact 5 blanks | Proposed deterministic | None executable | MAPPING_DRAFT |
| A2 | 4 order-independent pairs | Proposed deterministic | None executable | MAPPING_DRAFT |
| A3 | Exact 6 blanks | Proposed deterministic | None executable | MAPPING_DRAFT |
| A4 | 4 corrected sentences | Proposed deterministic; response serialization unresolved | None executable | MAPPING_DRAFT |
| A5 | 3 comprehension decisions | Proposed deterministic; T/F aliases UI-dependent | None executable | MAPPING_DRAFT |
| A6 | 4 ordered sentences | Proposed deterministic; response serialization unresolved | None executable | MAPPING_DRAFT |
| A7 | Choice A | Proposed deterministic | None executable | MAPPING_DRAFT |
| A8 | 4 personal sentences | No automatic grading | None executable | REVIEW_REQUIRED |

## 5. Gates before Set A can be validated

1. Verify exact source headings and section-level source references against the unchanged ZIP.
2. Confirm Runtime response serialization for BLANKS, MATCHING, MULTI_PART, and CHOICE.
3. Resolve hypothesis IDs and phase compatibility from approved registries.
4. Link each part to exact authored feedback and recovery criteria; do not infer from neighboring prose.
5. Decide whether separate context/factual scoring axes exist; do not collapse them into grammar correctness.
6. Add integration tests using the exact v1.0.2-draft source package and this mapping version.
7. Keep A8 in REVIEW_REQUIRED unless a separately authored, deterministic, supported rubric is approved.

## 6. Change control

This document is a Core Lab mapping artifact only. It does not modify the Content Library ZIP, source Markdown, Content Library decisions, production, or `main`.
