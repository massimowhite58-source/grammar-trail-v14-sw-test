# TO BE A1 Semantic Mapping Inventory v0.1-draft

Status: source-grounded structural inventory only; not executable and not learner-deliverable.
Source: `TO_BE_A1_FULL_CONTENT_LIBRARY_v1.0.2-draft.zip`, four exercise documents.

## Rules
- Prompt modes and part IDs below are **proposals** based on prompt structure; not approved runtime mappings.
- Expected answers, accepted alternatives and Error Patterns remain source text, not converted to inferred rules.
- `hypothesisId` and phase mapping remain unresolved; no IDs are invented.
- No diagnostic conditions are executable until an exact raw-response condition is supported by the authored source.
- Open-response tasks remain `REVIEW_REQUIRED`.

## Inventory
| ID | Source title | Proposed mode | Proposed response parts | Source structure / caveat | Status |
|---|---|---|---|---|---|
| A1 | Choose the correct form | `BLANKS` | `blank_1`–`blank_5` | 5 individual form blanks | `MAPPING_DRAFT` |
| A2 | Match people and descriptions | `MATCHING` | `match_1`–`match_4` | 4 person-to-description matches; display order is irrelevant | `MAPPING_DRAFT` |
| A3 | Complete the sentences | `BLANKS` | `blank_1`–`blank_6` | 6 individual form blanks | `MAPPING_DRAFT` |
| A4 | Find the incorrect form | `MULTI_PART` | `sentence_1`–`sentence_4` | 4 independently scored sentence corrections | `MAPPING_DRAFT` |
| A5 | Read and decide: True or False | `MULTI_PART` | `decision_1`–`decision_3` | 3 True/False comprehension decisions | `MAPPING_DRAFT` |
| A6 | Build the sentence | `MULTI_PART` | `sentence_1`–`sentence_4` | 4 word-order sentence constructions | `MAPPING_DRAFT` |
| A7 | Choose the correct description | `CHOICE` | `choice` | one option; free-text equivalent only if interface supports it | `MAPPING_DRAFT` |
| A8 | Make it personal | `OPEN_RESPONSE` | `response` | 4 personal sentences; no deterministic rubric | `REVIEW_REQUIRED` |
| B1 | Choose and complete: affirmative or negative | `MULTI_PART` | `part_1_choice`, `part_2_blank` | 2 independently scored parts | `MAPPING_DRAFT` |
| B2 | Make the sentence negative | `TRANSFORM` | `response` | one negative transformation | `MAPPING_DRAFT` |
| B3 | Complete the negative sentences | `BLANKS` | `blank_1`–`blank_5` | 5 full be-form blanks before not | `MAPPING_DRAFT` |
| B4 | Find and correct the mistakes | `MULTI_PART` | `correction_1`–`correction_3` | 3 sentence corrections | `MAPPING_DRAFT` |
| B5 | Read and decide: True or False | `MULTI_PART` | `decision_1`–`decision_3` | 3 True/False comprehension decisions | `MAPPING_DRAFT` |
| B6 | Change full forms into short forms | `MULTI_PART` | `transformation_1`–`transformation_3` | 3 full-to-short negative transformations | `MAPPING_DRAFT` |
| B7 | Describe Maria and John | `OPEN_RESPONSE` | `response` | 3 fact-based sentences; free production, no deterministic rubric | `REVIEW_REQUIRED` |
| B8 | Tell me about yourself | `OPEN_RESPONSE` | `response` | at least 3 personal sentences; no deterministic rubric | `REVIEW_REQUIRED` |
| C1 | Choose the correct question | `CHOICE` | `choice` | one standard-question option | `MAPPING_DRAFT` |
| C2 | Put the words in order | `MULTI_PART` | `question_1`–`question_3` | 3 standard-question constructions | `MAPPING_DRAFT` |
| C3 | Match questions and answers | `MATCHING` | `match_1`–`match_3` | 3 question-to-answer matches | `MAPPING_DRAFT` |
| C4 | Give short answers | `MULTI_PART` | `short_answer_1`–`short_answer_3` | 3 short answers | `MAPPING_DRAFT` |
| C5 | Find and correct the mistakes | `MULTI_PART` | `correction_1`–`correction_4` | 4 standard-question corrections | `MAPPING_DRAFT` |
| C6 | Ask about Daniel | `MULTI_PART` | `question_1`–`question_4` | 4 questions about profile; target-scope boundary is authored | `MAPPING_DRAFT` |
| C7 | Complete the dialogue | `BLANKS` | `blank_1`, `blank_2` | 2 Are blanks in a dialogue; role coherence is authored | `MAPPING_DRAFT` |
| C8 | Meet a new neighbour | `OPEN_RESPONSE` | `dialogue` | open dialogue with required conversational moves; no deterministic rubric | `REVIEW_REQUIRED` |
| D1 | Mixed form selection | `MULTI_PART` | `item_1`–`item_4` | 4 mixed items; item 3 is negative form | `MAPPING_DRAFT` |
| D2 | Complete the conversation | `BLANKS` | `blank_1`–`blank_7` | 7 exact blank positions; short-answer syntax is constrained | `MAPPING_DRAFT` |
| D3 | Correct the message | `MULTI_PART` | `error_01`–`error_05` | 5 source-labelled independent errors within one message | `MAPPING_DRAFT` |
| D4 | Build sentences from facts | `MULTI_PART` | `affirmative_1`, `affirmative_2`, `negative_1`, `question_1` | 4 outputs with separate factual-consistency constraint | `MAPPING_DRAFT` |
| D5 | Read and answer | `MULTI_PART` | `answer_1`–`answer_4` | 4 reading-comprehension answers; answer-form requirements vary | `MAPPING_DRAFT` |
| D6 | Ask and answer from a profile | `MULTI_PART` | `question_1`–`question_4`, `answer_1`–`answer_4` | 4 question/short-answer pairs; 8 response fields proposed | `MAPPING_DRAFT` |
| D7 | Meet a new neighbour | `OPEN_RESPONSE` | `dialogue` | open dialogue; no deterministic rubric | `REVIEW_REQUIRED` |
| D8 | Independent introduction and meeting another person | `OPEN_RESPONSE` | `part_1_introduction`, `part_2_exchange` | 2 sequential communication parts; no deterministic rubric | `REVIEW_REQUIRED` |

## Source coverage
- Set A: A1–A8 (8 exercises).
- Set B: B1–B8 (8 exercises).
- Set C: C1–C8 (8 exercises).
- Set D: D1–D8 (8 exercises).
- B1 remains one exercise with two parts.
- D3 remains one exercise with five authored error subrecords.
- D8 remains one exercise with two sequential communication parts.

## Unresolved before executable mapping
1. Confirm exact Runtime response serialization and part granularity for each mode.
2. Resolve `hypothesisId` against an approved project registry.
3. Resolve phase compatibility against approved phase rules; do not infer from exercise order.
4. Convert answer keys and accepted alternatives into exact evaluator values, preserving source-specific constraints.
5. Convert Error Patterns into conditional rules only where the source supplies deterministic response evidence; otherwise retain `NO_DIAGNOSTIC`/`REVIEW_REQUIRED` behavior.
6. Resolve overlap between diagnostic conditions; the current classifier emits every matching rule and does not independently prove that two rules are non-overlapping.
7. Confirm feedback/recovery references at criterion level; current inventory points to authored sections only.
8. Add source-package integration tests against these exact source documents before marking any record `READY_FOR_VALIDATION`.

## Important implementation observation
The current evaluator supports exact accepted-value matching and multi-part aggregation. It does not yet provide a separate semantic scoring axis for context accuracy, communication completion, or instruction following. These must not be silently collapsed into grammar correctness.
