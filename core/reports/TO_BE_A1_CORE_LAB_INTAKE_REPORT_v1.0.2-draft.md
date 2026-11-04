# Core Lab — TO BE A1 v1.0.2-draft Intake Report

**Content package:** `TO_BE_A1_FULL_CONTENT_LIBRARY v1.0.2-draft`  
**Core branch:** `feat/persistence-adapter-test-double`  
**Review type:** structural intake + Core Lab capability compatibility  
**Decision:** CONTENT FIXTURE ACCEPTED FOR INTAKE; FULL FUNCTIONAL EXECUTION BLOCKED  
**Scope:** isolated test branch only. No `main`, production, learner data, or Content Library source repository changes.

## 1. Package received

The package archive is stored at:

`core/fixtures/TO_BE_A1_FULL_CONTENT_LIBRARY_v1.0.2-draft.zip`

It contains nine Markdown files:
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

The current implementation does **not** yet provide the full execution path required by this package:

### CLAB-TB-CORE-001 — Answer evaluator / accepted-alternative matcher
`Learning Core submitAnswer()` receives a caller-supplied boolean `correct`. It does not evaluate raw learner responses against per-exercise expected answers and accepted alternatives. `Content Runtime` resolves approved task records but does not evaluate answers.

**Status:** BLOCKED for real answer/alternative testing.

### CLAB-TB-CORE-002 — Diagnostic classifier and independent diagnostic records
The current answer/event contract does not define canonical Error Pattern output or a diagnostic-record event/API that guarantees one record per independent error. D3's five outcomes cannot be verified end-to-end.

**Status:** BLOCKED for package-specific diagnostic testing.

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

## 4. What can be tested now

The package can be used for:
- manual review of all 32 prompts, keys, accepted alternatives, Error Patterns, feedback and recovery rules;
- creating a versioned test fixture and later a JSON adapter/export;
- defining evaluator, diagnostic, feedback and recovery acceptance contracts;
- testing generic event persistence and append-only invariants separately from content evaluation.

The existing generic IndexedDB and event-history tests do not prove that TO BE A1 content is evaluated correctly. Do not report them as successful TO BE A1 exercise runs.

## 5. Required next implementation steps

1. Define a deterministic Answer Evaluator input/output contract that preserves the raw response and supports accepted alternatives.
2. Define Diagnostic Classifier output with multiple independent diagnostic records linked to one answer event.
3. Define Feedback selection by diagnosed Error Pattern.
4. Extend or adapt Recovery Runtime to select authored cause-specific recovery without editing history or revealing the final answer.
5. Define an explicit exercise-to-phase mapping and scope for mixed practice / later recall.
6. Create a versioned machine-readable task export/adapter for the current Content Runtime schema.
7. Only then run all 32 exercises and record actual learner-response test cases.

## 6. Data integrity rules

- Preserve the original learner response exactly as submitted.
- Append feedback, diagnostic and recovery events; never rewrite the answer event.
- Keep separate diagnostic records for separate causes.
- Do not convert a grammatical but instruction-mismatched answer into a grammar error.
- Do not classify a correct slow answer as incorrect.
- Keep content version and core/runtime version on test evidence.

## 7. Final intake decision

**Accepted:** v1.0.2-draft is accepted as a complete human-readable content fixture for Core Lab intake and further adapter/evaluator design.

**Not accepted yet:** full functional execution, answer validation, diagnostic correctness, feedback selection, cause-specific recovery, and complete adaptive sequence.

No functional pass is claimed. Keep PR draft; do not merge. No production deployment or learner-facing integration is authorized by this intake.
