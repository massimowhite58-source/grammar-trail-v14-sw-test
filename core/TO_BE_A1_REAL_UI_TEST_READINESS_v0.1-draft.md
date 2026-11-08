# Core Lab — TO BE A1 Real Interface Test Readiness v0.1-draft

Status: preparation checklist; no learner UI integration or learner-delivery approval.
Target branch: `feat/persistence-adapter-test-double`
Baseline commit: `ee775d56a6138e0052432b0221e9f03a2c57b630`

## 1. Purpose

Prepare a controlled end-to-end test of the actual TO BE A1 learner interface in Core Lab. The objective is to observe the real UI payload, verify the response/evaluation boundary, and trace the resulting immutable events. This is not a request to treat the existing Present Simple demo as a TO BE A1 interface.

## 2. Confirmed starting point

- `core-demo.html` is an isolated four-phase Present Simple third-person-singular demonstration.
- It currently serializes legacy choice/text payloads and calculates a caller-side `correct` boolean.
- It does not call `answer-evaluator.mjs`, expose stable TO BE A1 part/option IDs, or demonstrate independent assessment axes.
- `index.html` is the large Grammar Trail learning-notes/library page, not a verified TO BE A1 Core Lab exercise runner.
- The repository contains Set A/Set B evaluator-level mapping tests and draft contracts, but no verified TO BE A1 learner interface response path.
- Therefore, no existing page is approved as the real TO BE A1 interface test target.

## 3. Scope boundary

In scope:
- A dedicated TO BE A1 Core Lab test surface or an explicitly identified existing TO BE A1 interface.
- Exact package/version identity for the test content.
- UI-to-response-adapter-to-evaluator-to-classifier-to-Learning-Core flow.
- Raw response preservation, event linkage, assessment axes, task completion and review-required behavior.
- Browser interaction checks and an auditable test report.

Out of scope:
- Production or `main`.
- Changes to the source Content Library archive or its version.
- PR #2 / Content Library validator workstream.
- Cloud sync, backend, authentication, AI integration, or learner-facing release.
- Replacing source content with demo answers or synthetic content during source-package validation.

## 4. Entry gates before a real UI test

Do not start end-to-end scoring until all are true:

1. **Target identified:** the exact HTML/app entry point for the TO BE A1 learner interface is named and inspected. It must render TO BE A1 tasks, not Present Simple placeholders.
2. **Source pinned:** the test uses the unchanged `TO_BE_A1_FULL_CONTENT_LIBRARY_v1.0.2-draft` source package or a separately approved version. Record exact package/version and exercise IDs.
3. **Response contract approved:** canonical envelope, value types, unknown/missing-part handling, and raw-value preservation are agreed.
4. **Stable identity approved:** task IDs, part IDs, and choice option IDs are stable and resolve against the exact content version. Visible array positions or display text alone are not persistent identifiers.
5. **Evaluator owns correctness:** UI submits learner input only. It cannot authoritatively submit `correct`, axis outcomes, diagnostics, or task completion.
6. **Runtime path defined:** response adapter validates the envelope; evaluator assesses the raw values; classifier uses only authored conditions; Learning Core consumes `taskSatisfied` when required axes exist.
7. **Event trace defined:** one submitted response can be followed from immutable raw answer event to evaluation and any separate diagnostic records using stable references.
8. **Review path present:** OPEN_RESPONSE without an approved deterministic rubric remains `REVIEW_REQUIRED`; no score is inferred from examples.
9. **Isolation confirmed:** test database/session is isolated, reset behavior is explicit, and no production learner history can be read or modified.

If a gate is not met, record the blocker and test only the independently verifiable UI behavior. Do not mark the exercise learner-ready.

## 5. Recommended test sequence

### Stage 0 — Interface reconnaissance (no scoring integration)

- Identify the real TO BE A1 interface entry point and its current branch/commit.
- Confirm which exercise IDs it renders and how it creates each control.
- Observe the exact submitted payload for each interaction without changing the source package.
- Record whether the UI submits a choice ID, blank value, full sentence, token, matching pair, or full open-response text.
- Record cancellation, empty submission, repeated click, reload, and navigation behavior.
- Do not infer response paths from `core-demo.html`.

### Stage 1 — Representative response shapes

Use source-authored exercises to inspect one real example of each format present in the actual interface:
- CHOICE: verify stable option identity.
- BLANKS: verify one raw value per independently assessed blank.
- MULTI_PART: verify each part is keyed separately inside the exercise response.
- TRANSFORM: verify whether the UI submits the full transformed sentence or a targeted token.
- OPEN_RESPONSE: verify full raw text preservation and `REVIEW_REQUIRED` routing.

Do not fabricate missing formats or add synthetic learner answers to the source archive.

### Stage 2 — TO BE A1 Set B focused validation

After Stage 0 and Stage 1 gates pass:
- B1: two parts remain separately addressable; option IDs match source option meanings.
- B2: full sentence response; full and contracted accepted forms follow the source.
- B3: each of five blanks is separately captured; only the authored blank value is evaluated.
- B4: three corrections are independently captured; confirm whether each response is a full sentence.
- B5: three comprehension decisions remain distinct and are not misclassified as construction skill.
- B6: three transformations preserve full raw responses; grammar and instruction axes are evaluated independently; `taskSatisfied` requires both.
- B7/B8: raw text is preserved and routed to `REVIEW_REQUIRED` unless an approved deterministic rubric is supplied.

### Stage 3 — Event and progression verification

For each submitted test response, verify:
- Exact raw response retained without UI trimming or evaluator normalization overwriting it.
- Exact task/content version and stable part identity attached.
- Evaluation result is derived by the evaluator, not supplied by the UI.
- Each diagnostic is a separate record linked to the same answer event and only emitted for its incorrect authored axis.
- No diagnostic is emitted for a correct axis.
- `taskSatisfied` gates completion when `requiredAxes` is present.
- Review-required answers do not advance as correct or incorrect by assumption.
- Event history remains append-only and survives the intended test reload boundary if persistence is part of the tested path.

## 6. Evidence to capture

For every test case, retain:
- Exercise ID and content package/version.
- Browser/device and interface build commit.
- UI action sequence.
- Raw UI payload as observed before evaluation.
- Canonical response envelope after adapter validation.
- Evaluator output, including per-part axes and `taskSatisfied`.
- Diagnostic classifier output and linked answer-event ID.
- Learning Core state before/after.
- Expected vs actual result and a defect ID if they differ.

Avoid real personal data. Use controlled test inputs only.

## 7. Defect classification

- **UI capture defect:** displayed interaction cannot produce or loses the intended learner response.
- **Serialization defect:** payload shape, part identity, option identity, or raw value is incorrect.
- **Adapter defect:** invalid/missing/unknown fields are silently accepted, discarded, or mutated.
- **Evaluation defect:** authored accepted values or assessment axes produce the wrong outcome.
- **Diagnostic defect:** unsupported, ambiguous, duplicate, or wrong-axis diagnostic is emitted.
- **Learning Core defect:** progression ignores `taskSatisfied` or advances on `REVIEW_REQUIRED`.
- **Persistence defect:** raw answer/evaluation/diagnostic history is lost, rewritten, duplicated, or mislinked.
- **Content-source issue:** source material is incomplete or ambiguous; report it without silently editing the source package.

## 8. Stop conditions

Stop the affected test and report a blocker if:
- The interface target is not actually TO BE A1.
- Stable part/option IDs cannot be established.
- The UI submits a correctness boolean as an authority.
- Raw input is modified before it can be preserved.
- A response cannot be linked to the exact task/content version.
- An open response is auto-scored without an approved rubric.
- A test would require modifying the source Content Library or production/main.

## 9. Current readiness assessment

- Evaluator/classifier and Set A/Set B mapping test suites: present in the Core Lab branch; CI contract workflow passed at the baseline commit.
- Browser IndexedDB smoke workflow: passed at the baseline commit.
- Real TO BE A1 interface target: **not yet verified**.
- Canonical learner response contract: **draft only**.
- Stable TO BE A1 part/option IDs and actual UI payloads: **not yet verified**.
- Response adapter and end-to-end UI wiring: **not implemented / not verified**.
- Set A/Set B learner delivery: **not approved**.

## 10. Next action

Perform Stage 0 reconnaissance against the actual TO BE A1 interface. If no such interface exists in this branch, first identify the correct interface source/artifact and agree on a dedicated isolated Core Lab test surface. Do not wire the evaluator into the Present Simple demo as a substitute.
