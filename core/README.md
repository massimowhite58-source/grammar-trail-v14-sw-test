# Grammar Trail — deterministic core v0.1

## Status
- **Implemented:** pure deterministic learning-cycle module in `learning-core.mjs`.
- **Implemented:** isolated browser laboratory at `../core-demo.html`.
- **Implemented:** `content-runtime.mjs` — approval/version checks, validated content package, exact-version local fallback, and non-blocking operational events.
- **Implemented:** `task-runtime.mjs` — delivery Quality Gate for approved content, version/phase/hypothesis consistency, mandatory User State, safety block, and premature-MIX prevention.
- **Implemented:** `recovery-runtime.mjs` — bounded, deterministic recovery ladder that preserves the target, never edits correctness/history, blocks unsafe states, and can recommend a pause instead of escalating forever.
- **Design system:** `../GRAMMAR_TRAIL_DESIGN_SYSTEM.md` records Core Lab as the visual reference; question prompts now use navy, semibold 19.2 px text with increased line-height, and explanation text is larger and darker.
- **Persistence boundary:** `PERSISTENCE_CONTRACT.md` defines append-only events, idempotent merges, rebuildable snapshots, explicit failure behavior, and acceptance tests.
- **Persistence test double:** `persistence-adapter.mjs` provides an in-memory reference implementation for contract tests only. It is not durable storage and is not connected to the UI.
- **Tested:** 8 Content Runtime tests and 8 Task Runtime tests, in addition to 9 learning-core tests.
- **Tested:** Node.js built-in unit suite; 34 tests passed on 2026-10-27 across the learning core, Content Runtime, Task Runtime, and Recovery Runtime.
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
- `integration.test.mjs` — end-to-end contracts across all four runtime modules.
- `PERSISTENCE_CONTRACT.md` — durable-storage boundary and acceptance criteria.
- `persistence-adapter.mjs` / `persistence-adapter.test.mjs` — in-memory contract test double and persistence acceptance tests.
- `../core-demo.html` — isolated browser exercise for manual end-to-end checks.

Run all suites with: `node --test core/learning-core.test.mjs core/content-runtime.test.mjs core/task-runtime.test.mjs core/recovery-runtime.test.mjs core/integration.test.mjs core/persistence-adapter.test.mjs`.

## Next
1. Run the expanded Node.js test command, including `persistence-adapter.test.mjs`.
2. Review adapter semantics against Data Model v1.1 and add explicit User Facts isolation tests.
3. Only after the contract tests are stable, choose and implement the smallest local durable adapter.
4. Integrate into the main UI only after durable-storage tests are stable.
