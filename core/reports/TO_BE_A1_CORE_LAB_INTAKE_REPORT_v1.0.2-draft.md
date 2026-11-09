# Core Lab — TO BE A1 v1.0.2-draft Intake Report

**Content package:** `TO_BE_A1_FULL_CONTENT_LIBRARY v1.0.2-draft`  
**Core branch:** `feat/persistence-adapter-test-double`  
**Review type:** structural intake + Core Lab capability compatibility  
**Decision:** STRUCTURAL REVIEW PASS; PACKAGE ARCHIVE NOT YET STORED IN REPOSITORY; FULL FUNCTIONAL EXECUTION BLOCKED  
**Scope:** isolated test branch only. No `main`, production, learner data, or Content Library source repository changes.

## 1. Package received

The exact package archive is available in the current ChatGPT conversation as:

`TO_BE_A1_FULL_CONTENT_LIBRARY_v1.0.2-draft.zip`

The repository contains this intake report. The ZIP itself is **not currently stored in the repository**; do not treat this report as evidence that the fixture was successfully committed.

The archive contains nine Markdown files:
- `README.md`
- `CORE_LAB_HANDOFF.md`
- `EXERCISE_BANK_INDEX.md`
- `DIAGNOSTIC_TAXONOMY_AND_RECOVERY_MAP.md`
- `SET_A_EXERCISES_AND_ANSWER_FEEDBACK.md`
- `SET_B_EXERCISES_AND_ANSWER_FEEDBACK.md`
- `SET_C_EXERCISES_AND_ANSWER_FEEDBACK.md`
- `SET_D_EXERCISES_AND_ANSWER_FEEDBACK.md`
- `CHANGELOG_v1.0.2.md`

## 2. Structural validation

| Check | Result |
|---|---|
| ZIP integrity | PASS |
| Files in archive | 9 |
| Exercise IDs | 32 unique IDs: A1–A8, B1–B8, C1–C8, D1–D8 |
| Required per-exercise sections | Present for all 32 |
| B1 grouping | One exercise with two separately scored parts |
| D3 grouping | One exercise with five diagnostic subrecords |
| Error Pattern tags vs canonical taxonomy | No unknown tags |
| Per-exercise recovery coverage | Explicitly mapped; D3 maps by subrecord ID |
| README/Handoff package version | v1.0.2-draft |
| Historical provenance | Consolidated editorial assembly; not claimed as byte-for-byte recovery |

This is a structural/documentation validation. It is not a linguistic certification or a learner-facing release approval.

## 3. Core Lab compatibility findings

The current Core Lab branch provides deterministic content resolution, task delivery checks, append-only Learning Event recording/reconstruction, generic recovery escalation, and IndexedDB persistence tests.

The current implementation now includes first-draft generic Answer Evaluator, Diagnostic Classifier, and Content Library Adapter modules. The adapter validates a normalized package inventory, source provenance, canonical tags, B1/D3 boundaries, and refuses to infer learning phases or approve draft content. The package-specific exercise records and evaluator descriptors are still incomplete:

### CLAB-TB-CORE-001 — Answer evaluator / accepted-alternative matcher
`Learning Core submitAnswer()` receives a caller-supplied boolean `correct`. It does not evaluate raw learner responses against per-exercise expected answers and accepted alternatives. `Content Runtime` resolves approved task records but does not evaluate answers.

**Status:** GENERIC MODULE IMPLEMENTED + UNIT TESTED; ADAPTER CONTRACT IMPLEMENTED + UNIT TESTED; BLOCKED for package execution until all 32 source exercise records and authored evaluation descriptors are mapped.

### CLAB-TB-CORE-002 — Diagnostic classifier and independent diagnostic records
The current answer/event contract does not define canonical Error Pattern output or a diagnostic-record event/API that guarantees one record per independent error. D3's five outcomes cannot be verified end-to-end.

**Status:** GENERIC MODULE IMPLEMENTED + UNIT TESTED; ADAPTER VALIDATES CANONICAL TAGS; BLOCKED for package execution until per-exercise diagnostic rules are mapped into descriptors and connected to event persistence.

### CLAB-TB-CORE-003 — Feedback selection/runtime
The package contains authored feedback text, but the current Core Lab does not provide a runtime that selects and emits the matching feedback from the diagnosed cause.

**Status:** BLOCKED for end-to-end feedback testing.

### CLAB-TB-CORE-004 — Error-specific recovery
The current Recovery Runtime escalates a generic support ladder based on history and User State. It does not accept a canonical Error Pattern and resolve the package's cause-specific recovery instructions.

**Status:** PARTIAL CORE ONLY; package-specific recovery correctness BLOCKED.

### CLAB-TB-CORE-005 — Full learning-cycle phase mapping
Learning Core currently models `NEW → UNDERSTAND → RECALL → USE`. The wider cycle includes mixed practice, later recall and strengthening; these are not fully represented in the current Learning Core phase progression.

**Status:** BLOCKED for full adaptive sequence certification. Do not silently expand the phase model as part of this content intake.

### CLAB-TB-CORE-006 — Machine-readable task records
The delivered archive is human-readable Markdown. It does not include a normalized JSON task export that matches the current Content Runtime schema (`knowledgeItemId`, `contentVersion`, `phase`, `approvalState`, `taskId`, `hypothesisId`, `payload.prompt`).

**Status:** BLOCKED for direct Content Runtime loading; fixture is available for manual/test-adapter work.

## 4. Current Core contract test evidence\n\nOn commit `5038bc28f67d5d56715fdfa0fbad8518c35d49ef`, the expanded Node.js contract workflow passed **98/98 tests** (0 failed), including Answer Evaluator, Diagnostic Classifier, and Content Library Adapter contract suites. The IndexedDB browser smoke workflow also passed on the same code commit. These results validate generic modules, synthetic adapter fixtures, and the existing persistence smoke suite only; they do not certify the TO BE A1 Markdown package or its 32 exercise mappings.\n\n## 5. Content Adapter status\n\n`content-library-adapter.mjs` and its tests have been added. It validates the exact 32-ID inventory, nine source-document inventory, source provenance, concrete diagnostic tags, B1 as one exercise with two parts, and D3 as one exercise with five ordered diagnostic subrecords. It will not infer phase assignments, approve draft content, or permit learner delivery without an explicit evaluation descriptor. This is a generic adapter contract tested with synthetic fixtures; the actual nine-document package has not yet been converted into 32 normalized records.\n\n## 6. What can be tested now

The package can be used for:
- manual review of all 32 prompts, keys, accepted alternatives, Error Patterns, feedback and recovery rules;
- creating a versioned test fixture and later a JSON adapter/export;
- defining evaluator, diagnostic, feedback and recovery acceptance contracts;
- testing generic event persistence and append-only invariants separately from content evaluation.

The existing generic IndexedDB and event-history tests do not prove that TO BE A1 content is evaluated correctly. Do not report them as successful TO BE A1 exercise runs.

## 7. Required next implementation steps

1. Store the exact ZIP (or its nine source documents) in the isolated Core Lab fixture directory and verify the committed bytes against the source archive.
2. Define a deterministic Answer Evaluator input/output contract that preserves the raw response and supports accepted alternatives.
3. Define Diagnostic Classifier output with multiple independent diagnostic records linked to one answer event.
4. Define Feedback selection by diagnosed Error Pattern.
5. Extend or adapt Recovery Runtime to select authored cause-specific recovery without editing history or revealing the final answer.
6. Define an explicit exercise-to-phase mapping and scope for mixed practice / later recall.
7. Create a versioned machine-readable task export/adapter for the current Content Runtime schema.
8. Only then run all 32 exercises and record actual learner-response test cases.

## 8. Data integrity rules

- Preserve the original learner response exactly as submitted.
- Append feedback, diagnostic and recovery events; never rewrite the answer event.
- Keep separate diagnostic records for separate causes.
- Do not convert a grammatical but instruction-mismatched answer into a grammar error.
- Do not classify a correct slow answer as incorrect.
- Keep content version and core/runtime version on test evidence.

## 9. Final intake decision

**Structural review:** v1.0.2-draft passes the package-structure and cross-file checks and is suitable for fixture intake.

**Repository upload:** not completed. The package archive is not present in the repository; only this report is committed.

**Functional execution:** not accepted yet. Generic answer evaluation and diagnostic classification modules now exist with unit tests, but TO BE A1 package execution, feedback selection, cause-specific recovery, and complete adaptive sequence remain unverified.

No functional pass is claimed. Keep PR draft; do not merge. No production deployment or learner-facing integration is authorized by this intake.


## Universal Content Package pipeline update

The work has been generalized beyond TO BE A1. A reusable Markdown ingestion module, `content-package-adapter.mjs`, now parses exercise headings and preserves every authored section (including non-standard subparts) and source provenance. A package profile supplies expected IDs, source documents, required sections and declared structural exceptions. The TO BE A1 profile is stored separately under `core/content-profiles/`; it is configuration, not a fork of the parser.

The universal adapter is deliberately separate from semantic grading. It does not infer accepted answers, evaluation rules, diagnostics, feedback, recovery, hypotheses or phases from Markdown prose. Those mappings remain explicit and versioned. Draft content remains non-deliverable.

The updated CI workflow passed **106/106 Node.js contract tests** on commit `34adaafc669f5e516a718b7d6c17d9767dc15cbf`. The browser IndexedDB smoke workflow for the same commit was still running at the time this report was updated. These tests validate the generic parser using synthetic fixtures; the actual TO BE A1 documents have been independently inspected for 32 unique IDs and required sections, but have not yet been run through the repository adapter as a committed fixture.

Future content blocks should require only a profile plus authored semantic mappings; they should reuse the universal parser, Answer Evaluator, Diagnostic Classifier, event model and shared CI suites.


The TO BE A1-specific profile is now separately versioned and has its own contract tests. It declares the four exercise-bearing source documents, exact A1–D8 inventory, common required authored sections, B1's two-part markers, D3's five diagnostic IDs, and D8's two communication subparts. The shared parser remains package-neutral.

On commit `36434212b380ce8d97cbf6c48e06f4b652d24192`, the expanded Node.js contract workflow passed **110/110 tests** (0 failed), including the universal adapter and TO BE A1 profile tests. The IndexedDB browser smoke workflow for that commit was still in progress at the time of this update. The four source Markdown files were independently inspected: 32 unique exercise headings were found, each had the required authored sections, and the declared B1/D3/D8 structural markers were present. This source inspection is not yet a repository-adapter ingestion test; the next task is to run the actual package through the universal adapter and retain the resulting normalized source records as an isolated Core Lab fixture.
