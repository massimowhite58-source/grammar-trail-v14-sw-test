# Core Lab — TO_BE_A1 Quality Package Intake Report

**Package:** TO_BE_A1_QUALITY_PACKAGE v1.0-draft  
**Review type:** intake and architecture compatibility audit  
**Status:** BLOCKED — full functional execution not possible from the supplied archive  
**Scope:** Core Lab test branch only. No Content Library source files changed.

## 1. Archive inventory

The supplied ZIP contains five Markdown files:
- CORE_LAB_HANDOFF.md
- TO_BE_A1_QUALITY_PACKAGE.md
- EXERCISE_BANK_INDEX.md
- DIAGNOSTIC_TAXONOMY.md
- README.md

The archive does not contain:
- the full learner-facing content/prompt for each of the 32 claimed exercises;
- the Answer & Feedback Bank;
- per-exercise expected answers and accepted alternatives;
- per-exercise Error Pattern mappings;
- per-exercise feedback text and recovery mapping;
- structured machine-readable task records or an export suitable for Content Runtime.

The handoff describes these assets as included, but they are not present in the archive. The package specification contains general standards and a few examples, not the missing bank.

## 2. Intake findings

### CLAB-TB-PKG-001 — Missing executable exercise and answer bank
- **Severity:** P0 / release-blocking for this test request
- **Area:** package completeness / answer validation / feedback / recovery
- **Expected:** all exercise prompts, instructions, expected answers, accepted alternatives, Error Patterns, feedback and recovery rules are available for deterministic execution.
- **Actual:** only an exercise index and general package standards are supplied. No complete exercise payloads or Answer & Feedback Bank are present.
- **Impact:** cannot honestly execute or certify all 32 exercises, accepted alternatives, Error Patterns, Feedback or Recovery.
- **Status:** BLOCKED — awaiting complete source package.
- **Content action:** none. Do not alter Content Library.

### CLAB-TB-PKG-002 — Exercise count and ID grouping need reconciliation
- **Severity:** P1
- **Area:** exercise inventory / test coverage
- **Expected:** one unambiguous inventory mapping the declared total to unique exercise IDs and sub-records.
- **Actual:** README and index declare 32 exercises. The index splits B1 into B1-01 and B1-02 as separate IDs, while D3-01 through D3-05 are five diagnostic sub-records within one text exercise. Counting the stated B1 IDs separately and D3 as one exercise yields 33 exercise records (8 + 9 + 8 + 8). Counting D3 sub-records separately yields 37 atomic IDs. The declared total of 32 is therefore not reproducible from the stated grouping rules.
- **Status:** OPEN — package owner must clarify counting/grouping convention.

### CLAB-TB-CORE-001 — No deterministic answer evaluator / alternative matcher
- **Severity:** P0 for content execution
- **Area:** answer validation
- **Expected:** Core Lab evaluates learner response against per-item keys and accepted alternatives, while keeping grammar, context and instruction compliance distinct.
- **Actual:** current Learning Core `submitAnswer()` accepts a caller-supplied boolean `correct`; it does not evaluate a response against authored answer rules. Content Runtime resolves approved task records but does not evaluate learner responses.
- **Impact:** no genuine test of accepted alternatives or false-positive/false-negative answer classification can be performed through the current pipeline.
- **Status:** OPEN — requires a versioned evaluator contract/adapter before full exercise execution.

### CLAB-TB-CORE-002 — Per-error diagnostic records are not implemented in the current core contract
- **Severity:** P0 for multi-error diagnostic validation
- **Area:** diagnostics / event model
- **Expected:** each independent error in one response produces its own diagnostic record, linked to the original answer event, without merging distinct causes.
- **Actual:** current Learning Core records an answer event and, on an incorrect answer, a generic recovery event. It has no canonical Error Pattern field, diagnostic-record type, or API that enforces one record per independent error.
- **Impact:** D3's five independent diagnostic outcomes cannot currently be verified end-to-end. Manually inserting five events would test storage only, not the diagnostic engine.
- **Status:** OPEN — requires explicit diagnostic event contract and evaluator output shape.

### CLAB-TB-CORE-003 — Recovery is generic and not Error-Pattern-specific
- **Severity:** P1
- **Area:** recovery
- **Expected:** recovery strategy follows the detected cause (for example, form selection, negation placement, question word order, short-answer mapping, context understanding or communication completion).
- **Actual:** Recovery Runtime escalates a generic support ladder based on prior support level and User State. Its input does not include a canonical Error Pattern, and it cannot select cause-specific recovery guidance from the supplied taxonomy.
- **Impact:** support escalation can be smoke-tested, but package-specific recovery correctness cannot be certified.
- **Status:** OPEN — requires Error Pattern → recovery strategy mapping.

### CLAB-TB-CORE-004 — Learning phase model does not yet represent the complete package sequence
- **Severity:** P1
- **Area:** task sequencing / transfer
- **Expected:** package tasks map explicitly to the intended learning phase, including the conditions for mixed practice and later recall.
- **Actual:** Learning Core's active phase sequence is NEW → UNDERSTAND → RECALL → USE. Task Runtime recognizes MIX, but Learning Core's phase progression does not include MIX, RECALL_LATER or STRENGTHEN. The package describes these as part of the wider sequence but does not provide an exercise-level phase map.
- **Impact:** Set D mixed practice and later-recall claims cannot be tested as a complete adaptive sequence using the current Learning Core progression.
- **Status:** OPEN — needs explicit scope/phase mapping; do not expand phases silently as part of this content test.

## 3. What is supported by the current Core Lab

The current branch provides:
- deterministic Content Runtime resolution for approved task records and exact content version;
- Task Runtime delivery checks, including User State, approval and phase/version checks;
- Learning Core event append and reconstruction for the four current phases;
- generic Recovery Runtime escalation;
- IndexedDB event persistence prototype with idempotent duplicate handling and explicit event-ID conflict behavior;
- append-only history and deterministic reconstruction tests.

These capabilities do not amount to a working TO BE answer evaluator, diagnostic classifier, feedback bank, or per-error recovery engine.

## 4. Data integrity assessment

The existing core path records the response object in an ANSWER_SUBMITTED event and appends later events rather than editing prior events. Existing persistence tests cover event read-back, duplicate/conflict behavior, scoped reads, reconstruction and history preservation.

However, the supplied package cannot yet be run through that path because it lacks the exercise records and evaluator. Therefore:
- original-response preservation for TO BE learner responses: **NOT TESTED**;
- event history immutability under TO BE feedback/recovery: **NOT TESTED**;
- independent diagnostic records for D3: **NOT TESTED**;
- cross-exercise feedback/recovery correctness: **NOT TESTED**.

No result is inferred from generic persistence tests.

## 5. Test execution status

| Test area | Status | Reason |
|---|---|---|
| All 32 exercises | BLOCKED | Exercise content absent |
| Accepted alternatives | BLOCKED | Answer bank absent; no evaluator |
| Error Patterns | BLOCKED | Per-exercise mappings absent; no classifier |
| Feedback | BLOCKED | Feedback bank absent |
| Recovery | PARTIAL CORE ONLY | Generic support ladder exists; no error-specific mapping |
| Original answer preservation | NOT TESTED FOR PACKAGE | No TO BE exercise run |
| Event history preservation | PARTIAL CORE ONLY | Generic persistence tests exist; no package-linked run |
| Separate diagnostic records | BLOCKED | Diagnostic event contract/engine absent |
| Quality Gate | DOCUMENT REVIEW ONLY | Cannot validate item-level criteria |

## 6. Required handoff to unblock testing

Provide a complete, versioned archive containing:
1. all exercise prompts, instructions, context/profile/text assets and response formats for every exercise ID;
2. Answer & Feedback Bank with expected answers and accepted alternatives;
3. Error Pattern mapping per item and per independently diagnosable error;
4. feedback text and cause-specific recovery mapping;
5. an explicit mapping of all IDs to the declared 32-exercise count, including B1 and D3 grouping;
6. exercise-level skill tags, phase assignment, and content version;
7. machine-readable task records if available (JSON is preferred), while retaining the human-readable source.

After receipt, Core Lab can create an isolated fixture from the exact package version, run each exercise and edge case, verify event persistence and per-error diagnostics, and issue a final report. No Content Library source changes are authorized by this report.

## 7. Final intake decision

**TO_BE_A1 v1.0-draft is NOT ACCEPTED for full functional testing yet.**

This is a package-completeness and core-capability block, not a verdict that the grammar content itself is defective. No per-exercise content defect is declared without seeing the actual exercise and answer records. No Content Library files have been edited.
