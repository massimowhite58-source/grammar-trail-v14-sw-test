# TO BE A1 Isolated Core Lab Surface — Design Specification v0.1-draft

**Status:** Design draft; no learner UI implemented by this document.  
**Target branch:** `feat/persistence-adapter-test-double`  
**Design baseline:** `7f6e33ac35210982fbbe96e6ccfb1e63f33c5096`  
**Source package:** `TO_BE_A1_FULL_CONTENT_LIBRARY_v1.0.2-draft` (external test fixture; immutable)

## 1. Purpose

Define a separate, controlled browser surface for inspecting and later testing the real TO BE A1 source exercises. The surface must make actual UI response capture observable without treating the existing Present Simple demo as a TO BE A1 runner.

This document specifies boundaries and acceptance criteria. It does not implement the page, approve content for learner delivery, or authorize changes to the source Content Library.

## 2. Proposed location and isolation

Proposed entry point: `core/to-be-a1-lab.html`.

The page is a Core Lab-only test surface:
- It is not linked from the production dashboard.
- It does not replace or modify `core-demo.html`.
- It does not rewrite `index.html`.
- It does not read, migrate, clear, or write the existing dashboard progress keys.
- It uses an explicitly namespaced test session/database if persistence is later enabled.
- It displays a visible test-only label and the exact source package/version under test.
- It must not be described as a production or learner-facing interface.

The exact implementation files and module boundaries are to be confirmed before coding. A small page/module pair is preferred over extending the legacy demo.

## 3. Source-content boundary

The only exercise content for this test surface is the unchanged source package `TO_BE_A1_FULL_CONTENT_LIBRARY_v1.0.2-draft`.

Rules:
1. Preserve source wording, exercise IDs, order, answer/feedback material, and provenance.
2. Do not invent substitute exercises, answers, accepted alternatives, diagnostic mappings, feedback, recovery instructions, hypothesis IDs, or learning phases.
3. Do not write generated test annotations back into the source archive.
4. Any UI-specific manifest or mapping must be a separate derived test artifact, versioned independently and traceable to source file, heading, exercise ID, and package version.
5. If the source does not define a field needed by the UI, mark it unresolved; do not fill it by inference.

The page may initially render only exercises whose display structure can be represented faithfully. An unsupported exercise format must show an explicit blocked/unsupported status rather than silently degrading to another interaction type.

## 4. Separation of responsibilities

The intended future flow is:

`Source Exercise → UI Renderer → Raw UI Response → Response Adapter → Answer Evaluator → Diagnostic Classifier → Learning Core / Event Store`

Responsibilities:
- **Source/manifest:** supplies exact exercise text and approved structural metadata.
- **UI renderer:** presents the exercise and collects learner input. It does not decide correctness.
- **Raw response capture:** preserves the exact values emitted by controls before normalization.
- **Response adapter:** validates shape and stable identity; it does not infer missing answers or repair malformed payloads.
- **Answer Evaluator:** applies explicit authored evaluation descriptors and returns per-part/per-axis results.
- **Diagnostic Classifier:** applies only explicit, non-ambiguous authored conditions.
- **Learning Core:** consumes evaluator-owned completion outcome; it must not trust a UI-supplied correctness boolean.
- **Event Store:** retains immutable raw response and linked derived records according to the approved event contract.

No scoring integration is authorized until the response envelope, stable IDs, and event linkage contract are approved.

## 5. UI response capture requirements

For each exercise interaction, the implementation must expose an inspectable raw payload before evaluation. The inspection view is for test evidence and must not alter the captured value.

Capture requirements:
- Preserve exact user-entered strings, including casing, punctuation, whitespace, and empty values.
- Preserve one independently addressable value for each source-defined response part/blank.
- Use stable source-backed part IDs and option IDs; array positions and visible labels alone are not persistent identity.
- Distinguish no submission, explicit empty submission, cancellation, and malformed submission.
- Preserve the selected option identity separately from its display text.
- Preserve full transformed sentences when that is what the actual UI control collects; do not reduce them to tokens.
- Preserve full open-response text without trimming or rewriting.
- Record UI build/commit, source package/version, exercise ID, and interaction attempt identifier in test evidence.

The exact payload schema is deliberately not prescribed here: it must be derived from observing the rendered controls and approved against `LEARNER_RESPONSE_CONTRACT_v0.1-draft.md`.

## 6. Required interaction formats

The UI audit must determine which of the following formats are actually present in the source exercises and supported by the page:

- `CHOICE`: stable option ID, not only selected index.
- `BLANKS`: separately keyed raw value for each blank.
- `MULTI_PART`: separately keyed response for each part.
- `TRANSFORM`: exact response shape used by the control (full sentence or targeted token).
- `OPEN_RESPONSE`: full raw text; route to `REVIEW_REQUIRED` unless an approved deterministic rubric exists.
- Other source-defined formats: report as unsupported until their rendering and response contracts are explicitly specified.

Do not add a response format merely to make the page appear complete.

## 7. Visual and interaction requirements

- Follow `GRAMMAR_TRAIL_DESIGN_SYSTEM.md` for typography, contrast, spacing, and responsive behavior.
- Keep question prompts highly legible and answer controls visually distinct.
- Selected, correct, incorrect, disabled, and review-required states must not rely on color alone.
- Do not show correctness or diagnostic feedback before a valid evaluation result exists.
- Provide clear navigation between source exercises without changing source order.
- Show exercise ID and package version in a compact test metadata area.
- Provide a collapsible/raw evidence panel for the captured payload; do not overwhelm the learner-facing task area.
- Keyboard and mobile touch interaction must be testable.

This is a test UI, not a redesign of the main product dashboard.

## 8. Test and storage isolation

Initial implementation should prefer an in-memory test session until a separate persistence test is explicitly authorized.

If persistence is added later:
- Use a dedicated database name and object-store namespace distinct from all existing application stores.
- Never clear or mutate existing databases, localStorage keys, or service-worker caches.
- Include an explicit test reset that can affect only the dedicated test namespace.
- Test reload behavior separately from in-session behavior.
- Keep source content storage separate from learner response/event storage.

No real personal data should be used. Controlled test inputs only.

## 9. Implementation sequence and gates

### Step A — UI data inventory
- Parse the unchanged source package into a read-only inventory.
- Identify source exercise IDs, headings, response instructions, visible parts/blanks/options, and source references.
- Mark unresolved structures and unsupported formats.
- Do not create answer/evaluation mappings in this step.

### Step B — Static faithful renderer
- Build the isolated page and render source exercise content without scoring.
- Verify ordering, wording, IDs, and layout against the source package.
- Add raw response capture for the actual controls.
- Keep evaluator and Learning Core disconnected.

### Step C — Response contract approval
- Compare observed raw payloads with the learner response contract.
- Resolve stable exercise/part/option IDs and empty/cancel/malformed semantics.
- Approve the canonical envelope before adapter implementation.

### Step D — Adapter/evaluator integration
- Implement only after Step C approval.
- Validate malformed and unknown identities fail closed.
- Ensure UI cannot supply correctness, axis outcomes, diagnostics, or completion.
- Preserve raw response independently from normalized evaluation input.

### Step E — Controlled end-to-end validation
- Start with representative formats, then Set B B1–B8.
- Capture raw payload, canonical envelope, evaluator result, classifier output, event linkage, and Learning Core before/after state.
- Report defects by layer; do not silently change source content to make tests pass.

## 10. Acceptance criteria for the isolated surface

The surface is ready for response-contract review only when:
1. It is a separate page and does not alter legacy pages.
2. It identifies the exact source package/version.
3. All rendered exercise IDs and source text match the unchanged source package.
4. Unsupported source structures are explicit.
5. Each control exposes its actual raw response shape.
6. Raw response values are preserved exactly before evaluation.
7. Exercise/part/option identities are stable and source-traceable, or explicitly marked unresolved.
8. No correctness is computed or asserted by the UI.
9. No source package, production, `main`, PR #2, or existing learner progress is modified.

Passing these criteria does not mean the exercises are learner-ready or approved for release.

## 11. Explicit non-goals

- Production deployment or learner-facing release.
- Replacing `core-demo.html` or changing the main dashboard.
- Modifying the source Content Library archive or creating a new source version.
- Resolving incomplete source diagnostics by invention.
- Auto-scoring open responses without an approved rubric.
- Backend, accounts, cloud sync, AI, analytics expansion, or broad architecture changes.
- Merging PR #1 or changing PR #2.

## 12. Current decision

**Decision proposed:** create a dedicated `core/to-be-a1-lab.html` test surface after completing the read-only source exercise inventory. The first implementation increment is a faithful static renderer plus raw UI response capture only. Evaluator, classifier, Learning Core, and durable persistence remain disconnected until their respective contracts and entry gates are approved.
