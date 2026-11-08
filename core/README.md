# Grammar Trail — deterministic core v0.1

## Status
- **Implemented:** pure deterministic learning-cycle module in `learning-core.mjs`.
- **Implemented:** isolated browser laboratory at `../core-demo.html`.
- **Implemented:** `content-runtime.mjs` — approval/version checks, validated content package, exact-version local fallback, and non-blocking operational events.
- **Implemented:** `task-runtime.mjs` — delivery Quality Gate for approved content, version/phase/hypothesis consistency, mandatory User State, safety block, and premature-MIX prevention.
- **Implemented:** `recovery-runtime.mjs` — bounded, deterministic recovery ladder that preserves the target, never edits correctness/history, blocks unsafe states, and can recommend a pause instead of escalating forever.
- **Implemented (v0.2 draft):** `answer-evaluator.mjs` — deterministic authored-answer evaluator with independent assessment axes per response part; legacy single-axis descriptors remain compatible; unsupported open responses fail closed.
- **Implemented (v0.3 draft):** `diagnostic-classifier.mjs` — evaluates explicit authored diagnostic rules against their declared assessment axis; separate records link to the persisted answer event.
- **Implemented (v0.1 draft):** `content-library-adapter.mjs` — validates a structured TO BE A1 package inventory, source provenance, canonical error tags, B1/D3 internal structures, and requires explicit phase/approval/evaluation mapping before learner delivery.
- **Design system:** `../GRAMMAR_TRAIL_DESIGN_SYSTEM.md` records Core Lab as the visual reference; question prompts now use navy, semibold 19.2 px text with increased line-height, and explanation text is larger and darker.
- **Persistence boundary:** `PERSISTENCE_CONTRACT.md` defines immutable Learning Events, mutable scoped User Facts, independent approved/versioned Content Cache, rebuildable snapshots, and acceptance criteria.
- **Persistence test double:** `persistence-adapter.mjs` provides in-memory event, User Fact, snapshot, and Content Cache operations for contract tests only. Cache cleanup is isolated from events and User Facts. It is not durable storage and is not connected to the UI.
- **Persistence validation:** GitHub Actions confirmed 52/52 tests passed on commit `5bb040335611f9399ddc9e8c6d5e05e4ffd193d7`, including the expanded User Fact and Content Cache cases. This validates the in-memory test double only; it does not validate durable storage or physical-device behavior.
- **Tested:** 8 Content Runtime tests and 8 Task Runtime tests, in addition to 9 learning-core tests.
- **Tested:** Node.js built-in unit suite; 34 tests passed on 2026-10-27 across the learning core, Content Runtime, Task Runtime, and Recovery Runtime.
- **New tests added:** `answer-evaluator.test.mjs` and `diagnostic-classifier.test.mjs`; CI inclusion is being verified.
- **Integration coverage:** `integration.test.mjs` exercises the chain Content Runtime → Task Runtime → Learning Core → Recovery Runtime, including immutable event validation and fail-closed safety/version gates. Four integration tests are included; all 38 tests passed in the latest run.
- **Not yet integrated:** main Grammar Trail learning UI and existing progress model.
- **Not yet production-ready:** durable persistence adapter, event migration/sync, full User State runtime, evidence calibration, review scheduling, Knowledge Map gating, accessibility QA, and release hardening.
- **AI:** intentionally not connected in this update.

## Cycle
`NEW → UNDERSTAND → RECALL → USE → COMPLETE`

One active Knowledge Item and one main hypothesis per task. The phase advances only after a correct response from the deterministic task evaluator. An incorrect response appends answer and recovery-support events and leaves the phase unchanged. A slow correct response remains correct.

## Contracts and invariants
- Approved content only; task content version must match the session.
- Safety is evaluated before learning: `UNSAFE → CLOSE_SESSION`; `CAUTION → REDUCE_LOAD`.
- Learning events are appended, not edited or deleted by the core.
- Event payloads are deep-frozen; state is reconstructed from events.
- Derived state is a projection, not historical truth.
- No AI/network dependency.
- The prototype's event ID generator is suitable only for this local demo; use a UUID strategy in the eventual persistence layer.
- The browser demo keeps history in memory only and deliberately does not touch the app's existing progress or local storage.

## Files
- `learning-core.mjs` — deterministic state reconstruction, decision and answer-processing functions.
- `learning-core.test.mjs` — core invariants.
- `content-runtime.mjs` / `content-runtime.test.mjs` — content resolution, eligibility, fallback, and observability.
- `task-runtime.mjs` / `task-runtime.test.mjs` — delivery Quality Gate.
- `recovery-runtime.mjs` / `recovery-runtime.test.mjs` — bounded recovery decisions.
- `answer-evaluator.mjs` / `answer-evaluator.test.mjs` — deterministic authored-answer matching.
- `diagnostic-classifier.mjs` / `diagnostic-classifier.test.mjs` — separate, evidence-linked diagnostic records.
- `content-library-adapter.mjs` / `content-library-adapter.test.mjs` — structured package validation and explicit Content Runtime task mapping.
- `integration.test.mjs` — end-to-end contracts across all four runtime modules.
- `PERSISTENCE_CONTRACT.md` — durable-storage boundary and acceptance criteria.
- `persistence-adapter.mjs` / `persistence-adapter.test.mjs` — in-memory contract test double and persistence acceptance tests.
- `../core-demo.html` — isolated browser exercise for manual end-to-end checks.

Run all suites with: `node --test core/learning-core.test.mjs core/content-runtime.test.mjs core/task-runtime.test.mjs core/recovery-runtime.test.mjs core/integration.test.mjs core/persistence-adapter.test.mjs core/answer-evaluator.test.mjs core/diagnostic-classifier.test.mjs`.

## Next
1. Run the expanded Node.js test command, including `persistence-adapter.test.mjs`.
2. Inspect the CI result for the expanded User Facts and Content Cache tests.
3. Address any failures, then review remaining gaps: storage/quota failure simulation, stable event ordering/pagination, and device scope.
4. Only after the contract tests are stable, choose and implement the smallest local durable adapter.
5. Integrate into the main UI only after durable-storage tests are stable.


## Universal Content Package pipeline (v0.1 draft)

- `content-package-adapter.mjs` is the shared Markdown ingestion engine for future content families. It parses exercise boundaries, preserves all original sections and source text, validates package inventory against a profile, and leaves semantic evaluation unmapped until authored rules are explicitly supplied.
- `content-package-adapter.test.mjs` covers the reusable parser and profile-driven ingestion contract.
- `UNIVERSAL_CONTENT_PACKAGE_CONTRACT_v0.1-draft.md` defines the universal record shape, separation of responsibilities, invariants and repeatable workflow for future grammar, vocabulary, context and communication blocks.
- `content-profiles/to-be-a1-v1.0.2-draft.mjs` contains TO BE A1-specific inventory and structural rules. B1 remains one two-part exercise; D3 remains one exercise with five separately identified diagnostic subrecords; D8 communication parts remain preserved.
- New content families should add a profile and semantic mappings, not clone or rewrite the parser, evaluator, classifier, persistence model or shared tests.
- Current ingestion status: the universal adapter and synthetic contract tests are in place. The actual four TO BE A1 exercise documents still need to be ingested and mapped; no learner delivery is enabled by this parser.



## Independent assessment dimensions (v0.1 draft)

- `ASSESSMENT_DIMENSIONS_CONTRACT_v0.1-draft.md` defines how one response can be assessed independently for grammar, instruction compliance, and future explicitly authored dimensions without collapsing them into one correctness flag.
- Evaluator v0.2 supports per-part `axes`, independent accepted alternatives, `primaryAxis`, per-part axis outcomes, aggregate `evaluation.dimensions`, and task-level `requiredAxes` / `taskSatisfied`. Existing descriptors without axes use the backward-compatible `answer` axis and retain legacy task completion behavior.
- Diagnostic classifier v0.3 supports `rule.axis`. A rule is considered only when its own axis is incorrect; an instruction diagnostic can therefore be emitted while the grammar axis remains correct.
- Set B B6 tests now cover all three transformations: full forms are grammatically correct but fail the requested-short-form instruction; contracted forms satisfy both axes; the authored non-standard form `I amn't` is diagnosed on the grammar axis.
- This remains evaluator-level behavior only. Actual UI payloads, complete content descriptors, hypothesis/phase mapping, feedback/recovery references, and learner-facing progress behavior are not verified or enabled.


## TO BE A1 UI response shape audit (v0.1 draft)

- `TO_BE_A1_UI_RESPONSE_SHAPE_AUDIT_v0.1-draft.md` records that the current `core-demo.html` is a Present Simple demonstration. It submits choice payloads as `{ selectedIndex, selectedText }` and text payloads as `{ text }`, computes correctness in the caller, and does not invoke the new Answer Evaluator.
- Consequently, B1–B8 part IDs and response paths remain unverified until the actual TO BE A1 learner interface is available. No UI wiring was changed.
