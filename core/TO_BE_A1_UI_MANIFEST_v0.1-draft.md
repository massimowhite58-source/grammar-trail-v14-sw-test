# TO BE A1 UI Manifest v0.1-draft

**Status:** Structural identity proposal; not approved for learner delivery.  
**Source package:** `TO_BE_A1_FULL_CONTENT_LIBRARY_v1.0.2-draft`  
**Source version:** `v1.0.2-draft`  
**Target branch:** `feat/persistence-adapter-test-double`  
**Companion inventory:** `core/TO_BE_A1_SOURCE_EXERCISE_UI_INVENTORY_v0.1-draft.md`  
**Scope:** Stable exercise, response-unit, matching-item, and option identities plus source provenance only.

## 1. Purpose and boundary

This manifest gives the isolated Core Lab renderer stable, source-traceable identities for the 32 TO BE A1 exercises and their visibly specified response structures. It is a separate derived test artifact. It does not modify or replace the Content Library source.

It contains no expected answers, accepted alternatives, evaluation descriptors, diagnostic mappings, feedback, recovery instructions, hypothesis IDs, learning phases, or learner-readiness decisions.

## 2. Identity rules

1. Exercise IDs remain exactly the source IDs `A1`–`D8`.
2. Every manifest-generated child ID is namespaced by its exercise ID: `<EXERCISE>.r<NN>` for response units, `<EXERCISE>.opt.<LETTER>` for visibly lettered options, and `<EXERCISE>.left.<NN>` / `<EXERCISE>.right.<NN>` for matching items.
3. IDs are identifiers, not positions to be recalculated at runtime. Once approved, they must not be regenerated from display order or translated display text.
4. Numbered source items retain their source numbers in the child identity suffix. Where the source gives a count but does not individually number or label the requested responses, the manifest records a proposed stable slot ID and marks its source locator/control grouping as unresolved.
5. Explicit source parts (for example B1 Part 1/Part 2 and D8 Part 1/Part 2) are represented as parts. They remain children of one exercise.
6. A logical response unit is not automatically a separate UI control. The `captureGrouping` field records whether the source determines grouping or the renderer decision remains open.
7. Option IDs are assigned only where the source visibly labels options A/B/C. Matching-side IDs are assigned to each source-listed item in its source order; the displayed text remains source content, not identity.
8. Open-response prompts remain one raw-text response unless the source explicitly divides them into parts. Required conversational moves are prompt constraints, not invented sub-fields.
9. IDs do not imply assessment independence, evaluator part IDs, hypothesis identity, or learning phase.

## 3. Source references

| Set | Source document |
|---|---|
| A | `SET_A_EXERCISES_AND_ANSWER_FEEDBACK.md` |
| B | `SET_B_EXERCISES_AND_ANSWER_FEEDBACK.md` |
| C | `SET_C_EXERCISES_AND_ANSWER_FEEDBACK.md` |
| D | `SET_D_EXERCISES_AND_ANSWER_FEEDBACK.md` |

Each row below references the exact source exercise heading by its unchanged exercise ID and title in the corresponding document above. The source package version is part of every manifest record's provenance.

## 4. Exercise and response-unit manifest

Legend:
- **Source-explicit**: the prompt explicitly numbers, labels, or separates the item/part.
- **Manifest slot**: a stable identifier proposed for a response requested by count/order, but not separately identified by the source.
- **Grouping open**: the source does not determine whether the renderer uses separate controls or a combined control.

| Exercise / source heading | Structural identity | Response-unit IDs | Additional stable IDs | Capture grouping / unresolved point |
|---|---|---|---|---|
| **A1 — Choose the correct form** | 5 numbered blanks | `A1.r01`–`A1.r05` | — | Source-explicit blank count; control grouping open |
| **A2 — Match people and descriptions** | 4 left items and 4 lettered descriptions | `A2.r01`–`A2.r04` (pair responses) | Left: `A2.left.01` Emma; `.02` Daniel; `.03` Anna and Mark; `.04` You and I. Right: `A2.right.a`–`.d` for source labels a–d | Matching pair serialization/control model open; preserve both endpoint IDs |
| **A3 — Complete the sentences** | 6 numbered blanks | `A3.r01`–`A3.r06` | — | Source-explicit blank count; control grouping open |
| **A4 — Find the incorrect form** | 4 numbered sentence corrections | `A4.r01`–`A4.r04` | — | Source-explicit item count; each correction's field/control shape open |
| **A5 — Read and decide: True or False** | 3 numbered decisions | `A5.r01`–`A5.r03` | — | Source-explicit; decision control representation open |
| **A6 — Build the sentence** | 4 numbered sentence constructions | `A6.r01`–`A6.r04` | — | Source-explicit; token ordering vs full-sentence entry unresolved |
| **A7 — Choose the correct description** | 1 choice with 3 lettered options | `A7.r01` | `A7.opt.A`, `A7.opt.B`, `A7.opt.C` | Source-explicit option labels; selected-option payload must retain option ID |
| **A8 — Make it personal** | 4 numbered sentence prompts | `A8.r01`–`A8.r04` | — | Four source-explicit prompt slots; one text area vs four controls unresolved |
| **B1 — Choose and complete: affirmative or negative** | 2 explicitly named parts | `B1.part1.r01`, `B1.part2.r01` | Part 1 options: `B1.part1.opt.A`, `.opt.B`, `.opt.C` | Part boundary source-explicit; each part's control type follows prompt; keep one exercise |
| **B2 — Make the sentence negative** | 1 sentence transformation | `B2.r01` | — | One response unit; full rewritten sentence expected by prompt; actual control shape to verify |
| **B3 — Complete the negative sentences** | 5 numbered blanks | `B3.r01`–`B3.r05` | — | Source-explicit blank count; control grouping open |
| **B4 — Find and correct the mistakes** | 3 numbered corrections | `B4.r01`–`B4.r03` | — | Source-explicit; correction capture granularity to verify |
| **B5 — Read and decide: True or False** | 3 numbered decisions | `B5.r01`–`B5.r03` | — | Source-explicit; decision control representation open |
| **B6 — Change full forms into short forms** | 3 numbered sentence transformations | `B6.r01`–`B6.r03` | — | Source-explicit; preserve each full raw sentence |
| **B7 — Describe Maria and John** | 3 requested sentences | `B7.r01`–`B7.r03` | — | Manifest slots based on stated count; source does not label individual sentence slots; grouping open |
| **B8 — Tell me about yourself** | 1 open response with minimum 3 sentences | `B8.r01` | — | One complete raw-text response; do not split into inferred fields |
| **C1 — Choose the correct question** | 1 choice with 3 lettered options | `C1.r01` | `C1.opt.A`, `C1.opt.B`, `C1.opt.C` | Source-explicit option labels; retain selected option ID |
| **C2 — Put the words in order** | 3 numbered question constructions | `C2.r01`–`C2.r03` | — | Source-explicit; token ordering vs full-sentence entry unresolved |
| **C3 — Match questions and answers** | 3 numbered questions matched to 3 lettered answers | `C3.r01`–`C3.r03` | Left: `C3.left.01`–`.03`; right: `C3.right.a`–`.c` | Pair serialization/control model open; preserve endpoint IDs |
| **C4 — Give short answers** | 3 numbered short-answer prompts | `C4.r01`–`C4.r03` | — | Source-explicit; control grouping open |
| **C5 — Find and correct the mistakes** | 4 numbered question corrections | `C5.r01`–`C5.r04` | — | Source-explicit; preserve full corrected questions; control grouping open |
| **C6 — Ask about Daniel** | 4 requested questions | `C6.r01`–`C6.r04` | — | Four requested outputs; no separate numbered prompt labels; manifest slots; grouping open |
| **C7 — Complete the dialogue** | 2 visibly marked dialogue blanks | `C7.r01`, `C7.r02` | — | Source-explicit blank count; keep dialogue context with each unit |
| **C8 — Meet a new neighbour** | 1 open dialogue | `C8.r01` | — | One complete raw dialogue; listed conversational moves are constraints, not separate response controls |
| **D1 — Mixed form selection** | 4 numbered blanks | `D1.r01`–`D1.r04` | — | Source-explicit blank count; control grouping open |
| **D2 — Complete the conversation** | 7 dialogue blanks | `D2.r01`–`D2.r07` | — | Seven blanks confirmed from source layout; preserve speaker/turn context; control grouping open |
| **D3 — Correct the message** | Instruction requires 5 corrections in one message | `D3.r01`–`D3.r05` | — | Count is source-explicit; individual error locations are not labelled; response slots are manifest-defined and require renderer decision |
| **D4 — Build sentences from facts** | 4 requested sentence outputs: 2 affirmative, 1 negative, 1 question | `D4.r01`–`D4.r04` | — | Output roles/order follow the source instruction; whether four separate controls are used remains open |
| **D5 — Read and answer** | 4 numbered comprehension answers | `D5.r01`–`D5.r04` | — | Source-explicit; preserve as comprehension responses, not assumed grammar-construction evidence |
| **D6 — Ask and answer from a profile** | 4 profile prompts, each requiring a question and short answer | `D6.r01.question` + `D6.r01.answer` through `D6.r04.question` + `D6.r04.answer` | Pair IDs `D6.r01`–`D6.r04` | Pair structure source-explicit; eight response components; control grouping open |
| **D7 — Meet a new neighbour** | 1 open conversation | `D7.r01` | — | One complete raw conversation; requested conversational moves are not separate fields |
| **D8 — Independent introduction and meeting another person** | 2 explicitly named parts | `D8.part1.r01`, `D8.part2.r01` | — | Part boundary source-explicit; preserve each part's full raw text; no inferred sub-fields |

## 5. Proposed canonical manifest record shape

The table above is the human-readable inventory. A renderer-facing representation should use records with this conceptual shape:

- `packageId`: stable package identifier (must be confirmed against the package metadata).
- `contentVersion`: `v1.0.2-draft` (matches the package profile's canonical value).
- `exerciseId`: exact source exercise ID.
- `source.documentPath`: one of the four source documents in §3.
- `source.heading`: exact source heading, including exercise ID and title.
- `parts[]`: source-explicit exercise parts, when present.
- `responseUnits[]`: stable IDs and structural kind/count only.
- `options[]` / `matchingItems[]`: stable IDs and source display references only.
- `captureGrouping`: `SOURCE_EXPLICIT` or `RENDERER_DECISION_REQUIRED`.
- `identityBasis`: `SOURCE_NUMBERED`, `SOURCE_LABELLED`, `SOURCE_PART`, or `MANIFEST_SLOT`.
- `unresolved[]`: explicit unresolved UI decisions.

The exact machine-readable schema and field names remain subject to review before renderer implementation. The conceptual record must not be expanded with answer or runtime-mapping data.

## 6. Explicit unresolved decisions

1. **Control grouping:** most multi-item exercises identify response counts but do not say whether one control per item or a combined field is intended.
2. **Matching payload:** A2 and C3 require stable endpoint identities, but the interaction model (dropdowns, drag/drop, paired selectors, etc.) is not specified by the source.
3. **Sentence ordering:** A6 and C2 do not specify draggable tokens versus full-sentence entry.
4. **Correction fields:** A4, B4, C5 and D3 need renderer-level confirmation of whether a full corrected sentence/message segment or targeted replacement is captured.
5. **Manifest slots:** B7, C6 and D3 have count/order requirements without separately labelled source response IDs/locations. Their child IDs are proposals, not source-authored identifiers.
6. **Open responses:** A8 has four prompt slots but does not specify one field or four. B8, C8, D7 remain single complete raw-text responses. D8 has two explicit parts.
7. **Stable package ID:** the package version is known, but the canonical package ID must be read from/confirmed against package metadata rather than invented here.
8. **Stable option IDs:** letter-based IDs are proposed for source-labelled options; the actual UI must emit these IDs, not just indexes or text.

## 7. Explicit exclusions

This manifest does not define or authorize:
- correct answers or accepted alternatives;
- evaluator modes, descriptors, axes, or completion rules;
- diagnostic conditions, error-pattern IDs, or recovery mapping;
- feedback selection or display;
- hypothesis/knowledge-item IDs or learning phases;
- a canonical learner response envelope or event schema;
- persistent storage, Learning Core integration, or production UI;
- approval of any exercise for learner delivery.

## 8. Acceptance gate for this draft

Review this manifest for source traceability and identity completeness. Before implementing controls, resolve the renderer decisions in §6 or make each unresolved state explicit in the test UI. The next implementation increment may render the exact source prompts and expose raw UI responses only; it must not score or classify them.

**Current status:** DRAFT — proposed stable identities; no approval implied.
