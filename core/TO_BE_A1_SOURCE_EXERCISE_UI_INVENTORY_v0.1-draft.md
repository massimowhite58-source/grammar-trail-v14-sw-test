# TO BE A1 Source Exercise UI Inventory v0.1-draft

**Status:** Read-only structural inventory; not an approved UI manifest or answer mapping.  
**Source:** `TO_BE_A1_FULL_CONTENT_LIBRARY_v1.0.2-draft`  
**Source files:** `SET_A_EXERCISES_AND_ANSWER_FEEDBACK.md`, `SET_B_EXERCISES_AND_ANSWER_FEEDBACK.md`, `SET_C_EXERCISES_AND_ANSWER_FEEDBACK.md`, `SET_D_EXERCISES_AND_ANSWER_FEEDBACK.md`  
**Purpose:** Identify the response structures the isolated Core Lab page must be able to render and capture.  
**Important:** Format labels below are structural observations from the learner prompts, not approved runtime `responseType` values.

## 1. Inventory method and limits

- Read the learner prompt and visible task structure for all 32 source exercises.
- Record exercise IDs, task shape, apparent response units, and unresolved UI decisions.
- Do not infer answer evaluation, accepted alternatives, diagnostic rules, feedback, recovery, hypothesis IDs, or learning phases from this inventory.
- The source package remains unchanged. This file is a separate Core Lab planning artifact.
- The inventory does not prove that any interface already exists or that any task is ready for learner delivery.

## 2. Set A — affirmative forms and basic statements

| ID | Prompt structure observed | Apparent response shape | UI questions to resolve |
|---|---|---|---|
| A1 | Choose am/is/are for five numbered sentence gaps | Five separately addressable blanks | Does the UI capture one value per blank or one combined text field? |
| A2 | Match four people/groups to four lettered descriptions | Four matching pairs | Does the UI emit stable left/right item IDs or only displayed labels? |
| A3 | Complete six sentence gaps with am/is/are | Six separately addressable blanks | One control per gap or a combined response? |
| A4 | Find an incorrect form across four statements and correct it | Sentence correction; likely multiple corrected sentences | Does each sentence have its own field? Are full sentences captured? |
| A5 | Read a short profile and decide three True/False statements | Three independent decisions | Are decisions separate controls with stable statement IDs? |
| A6 | Put words in order to make four statements | Four sentence-construction responses | Does each item submit a full sentence, ordered tokens, or both? |
| A7 | Choose one of three descriptions | One choice | Does the payload carry a stable option ID? |
| A8 | Write four short personal/invented sentences using four prompts | Open response with four requested sentence moves | One response field or four fields? Preserve full raw text. |

## 3. Set B — negative forms

| ID | Prompt structure observed | Apparent response shape | UI questions to resolve |
|---|---|---|---|
| B1 | Part 1: choose one of three sentences; Part 2: complete one sentence gap | Two-part task: choice + blank | Must retain separate part IDs and raw values. |
| B2 | Rewrite one affirmative sentence in the negative | One sentence transformation | Does the control capture the full rewritten sentence? |
| B3 | Complete five negative sentence gaps | Five separately addressable blanks | Preserve each gap independently. |
| B4 | Find and correct three mistakes | Three sentence corrections | Does each correction have an independent field and identity? |
| B5 | Read a short profile and decide three True/False statements | Three independent decisions | Keep comprehension decisions separate from sentence construction. |
| B6 | Rewrite three full negative sentences using standard short forms | Three sentence transformations | Preserve each full raw sentence; do not reduce to a token. |
| B7 | Use supplied facts to write three sentences | Open response with three requested sentences | One text area or three fields? Preserve full raw text. |
| B8 | Write at least three sentences about oneself | Open response with minimum-length/content instruction | Preserve the entire response; no automatic scoring without an approved rubric. |

## 4. Set C — questions and short answers

| ID | Prompt structure observed | Apparent response shape | UI questions to resolve |
|---|---|---|---|
| C1 | Choose one standard question from three options | One choice | Stable option identity required. |
| C2 | Put words in order to form three questions | Three sentence-construction responses | Full sentence or token ordering? |
| C3 | Match three questions to three answers | Three matching pairs | Stable item identities and pair serialization required. |
| C4 | Give three short answers using supplied cues | Three short-answer responses | Are answers captured independently? |
| C5 | Correct four standard questions | Four sentence corrections | Four separately addressable full-sentence corrections; source gives four numbered items. |
| C6 | Use a profile to write four questions about a person | Four sentence-production responses | Separate fields or one combined response? Preserve each question. |
| C7 | Complete two gaps in a dialogue | Two separately addressable blanks | Capture each gap independently and retain dialogue context. |
| C8 | Write a short dialogue containing several required conversational moves | Open response / dialogue | Preserve full raw dialogue; no inferred scoring. |

## 5. Set D — mixed practice and independent production

| ID | Prompt structure observed | Apparent response shape | UI questions to resolve |
|---|---|---|---|
| D1 | Complete four numbered sentences/questions with to be | Four separately addressable blanks | One response per numbered gap; preserve question word order context. |
| D2 | Complete a dialogue containing seven gaps | Seven separately addressable blanks in dialogue context | One raw value per gap; retain speaker/turn context. |
| D3 | Correct five mistakes in a short message | Five independent corrections | The source explicitly calls for five independent diagnostic records; UI must preserve five separately addressable corrections. |
| D4 | Build four sentences from supplied facts | Four sentence-production responses | Separate full-sentence capture is preferred only if the source layout supports it; verify before implementation. |
| D5 | Read a short text and answer four questions | Four short-answer/comprehension responses | Four separately addressable answers; do not classify as grammar construction by default. |
| D6 | Write four questions and a short answer for each, using a profile | Four question-and-answer pairs (eight response components if captured separately) | Preserve question/answer pairing and pair identity; source lists four prompts. |
| D7 | Write a short conversation with a new neighbour | Open response / dialogue | Preserve full raw dialogue; no inferred scoring. |
| D8 | Complete two parts: personal introduction and meeting another person | Two-part open response | Preserve each part separately if the UI presents them sequentially; retain both raw texts. |

## 6. Observed response-shape families

The source prompts visibly require these broad interaction families:

1. **Choice / decision:** A5, A7, B1 Part 1, B5, C1.  
   A5 and B5 contain multiple independent decisions rather than one choice.
2. **Blanks / completion:** A1, A3, B1 Part 2, B3, C7, D1, D2.  
   Exact per-item counts for D1 and D2 must be confirmed from the complete prompt layout during renderer preparation.
3. **Matching:** A2, C3.
4. **Sentence construction / ordering:** A6, C2, C6, D4.
5. **Sentence transformation / correction:** A4, B2, B4, B6, C5, D3.
6. **Short-answer production:** C4 and D6.
7. **Open production:** A8, B7, B8, C8, D7, D8.

These are descriptive families only. They do not authorize mapping every family to an existing evaluator mode. In particular, sentence correction, dialogue completion, matching, and multi-part production may need distinct renderer and serialization decisions.

## 7. Cross-cutting implementation implications

- A single exercise may contain multiple independently assessed response units.
- A single UI control may not be assumed to correspond to one evaluator part until the source layout and actual emitted payload are observed.
- Multi-part exercises need stable part IDs; array order alone is insufficient.
- Matching needs stable identities for both sides of each pair.
- Choice needs stable option IDs; visible option letters/text alone are not guaranteed IDs.
- Sentence production and correction should preserve full raw strings.
- Open production must retain the complete text and remain review-required unless an approved deterministic rubric exists.
- Comprehension decisions must not be silently treated as grammar-construction evidence.
- The renderer must preserve the source task order and exact prompt wording.

## 8. Unresolved before UI implementation

1. Exact blank/item counts and boundaries for D1, D2, D5, and D6 need a second layout-level inspection.
2. C5 correction boundaries need explicit confirmation.
3. A4, B4, and C5 correction field granularity must be observed against the source's complete exercise presentation.
4. Whether sentence-order tasks use draggable tokens or full-sentence text entry is a UI design decision, not specified by the inventory.
5. Stable part and option IDs do not yet exist as an approved UI contract.
6. The canonical response envelope remains a draft.
7. No evaluator, classifier, Learning Core, or persistence integration is authorized by this inventory.

## 9. Next action

The layout-level read has now confirmed the response-unit counts noted above. Next, define a separate, versioned UI manifest containing only stable structural identities and source references. Then implement the static faithful renderer and raw-response inspector. Do not add correctness or diagnostics during that increment.


## 10. Supplemental layout-level confirmation

A second read of the complete learner-prompt sections confirmed:
- **C5:** four numbered question-correction items.
- **D1:** four numbered gaps.
- **D2:** seven dialogue gaps.
- **D5:** four comprehension questions.
- **D6:** four question-and-answer pairs, each tied to one profile prompt.

This resolves the earlier count uncertainties only. It does not determine whether each response should be collected in separate controls or one combined field; that remains a renderer/response-contract decision. No answer keys or diagnostic sections were used to infer UI control behavior.
