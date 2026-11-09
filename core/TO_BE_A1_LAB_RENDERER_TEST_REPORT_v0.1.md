# TO BE A1 Isolated Lab Renderer — Test Report v0.1

**Status:** Browser smoke checks passed in GitHub Actions.  
**Test branch:** `feat/persistence-adapter-test-double`  
**PR:** #1 — remains Draft and unmerged.  
**Source fixture:** `TO_BE_A1_FULL_CONTENT_LIBRARY_v1.0.2-draft` (external to this repository; unchanged).

## 1. Implementation files

- `core/to-be-a1-lab.html` — isolated test-only source exercise renderer and in-memory raw response inspector.
- `core/to-be-a1-lab.browser.test.cjs` — Playwright/Chromium browser checks.
- `.github/workflows/indexeddb-browser-smoke.yml` — runs the TO BE A1 Lab browser checks before the existing IndexedDB smoke suite.
- `core/TO_BE_A1_UI_MANIFEST_v0.1-draft.md` — structural identity proposal used by the renderer.

## 2. Browser coverage

The dedicated Chromium test checks:

1. All 32 exercise IDs A1–D8 are available in source order.
2. Each exercise can be opened and renders a non-empty learner prompt with the expected source-document provenance.
3. Each exercise visibly discloses its provisional control layout; these choices are renderer decisions, not claims about controls prescribed by the source.
4. Raw text preserves leading/trailing spaces, punctuation, and line breaks.
5. Untouched controls are distinguished from explicitly emptied controls.
6. Choice controls retain stable option IDs separately from option display text.
7. Matching controls retain the selected right-side ID and the source-backed left-side ID.
8. True/False decisions are captured as source labels; no option IDs are invented for them.
9. D6 question/answer components remain separately addressable.
10. Navigation preserves the current in-memory responses; reset affects only the current exercise.
11. A reload starts a new empty in-memory session.
12. A 390 px viewport has no horizontal overflow.
13. No external scripts/resources or uncaught browser page errors are present.

## 3. Verified GitHub Actions runs

For branch head `3ee7fe5df548c8fe9c510d45a57bf26dca153be8`:

- [IndexedDB browser smoke tests — run 42605968792](https://github.com/massimowhite58-source/grammar-trail-v14-sw-test/actions/runs/42605968792) — **success**. The job completed the new “Run isolated TO BE A1 UI capture tests in Chromium” step and the existing native IndexedDB smoke step.
- [Persistence adapter contract tests — run 42605968817](https://github.com/massimowhite58-source/grammar-trail-v14-sw-test/actions/runs/42605968817) — **success**.

These results verify the test suite in headless Chromium and the existing persistence contract suite. They do not constitute a physical iPhone/Android/Mac device test.

## 4. Boundaries preserved

- The page does not import or invoke Answer Evaluator, Diagnostic Classifier, Learning Core, or persistence adapters.
- Responses exist only in a JavaScript in-memory map and disappear on reload.
- No correctness, diagnostic, feedback, recovery, phase, mastery, or progress values are calculated.
- The page contains learner prompts only; answer keys and semantic mappings are not included.
- The external source ZIP and source Content Library files were not edited or committed.
- Production and `main` were not modified.
- PR #2 was not touched.
- PR #1 remains Draft and unmerged.

## 5. Known limits and next gate

- The renderer uses provisional controls and field grouping where the source specifies response requirements but not the exact UI control model. Every exercise card labels its renderer decision.
- The browser test confirms the rendered page and raw control capture; it does not yet perform an automated byte-for-byte comparison of embedded prompt strings against the external source ZIP.
- Headless Chromium at 390 px verifies a narrow viewport layout, not a real-device Safari/Chrome session.
- No canonical learner response envelope has been approved.

**Next gate:** review the rendered controls and raw payloads against the source package and the learner response contract. Resolve or approve the provisional field-grouping choices before implementing a response adapter. Evaluator and Learning Core integration remain blocked until that contract is approved.
