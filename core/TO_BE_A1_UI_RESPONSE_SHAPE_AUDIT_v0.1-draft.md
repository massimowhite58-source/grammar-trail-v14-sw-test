# TO BE A1 UI Response Shape Audit v0.1-draft

Status: source inspection only; no UI changes made.

## 1. Inspected artifact

- File: `core-demo.html`
- Branch: `feat/persistence-adapter-test-double`
- The inspected demo contains a four-phase Present Simple third-person-singular sample, not the TO BE A1 B1–B8 content block.

## 2. Observed response payloads

The current demo creates two response shapes:

- Choice task: `{ selectedIndex, selectedText }`
- Text task: `{ text: String(selected) }`

Before calling `submitAnswer`, the demo itself calculates a boolean `correct`:
- Choice: selected index equals the task's `correctIndex`.
- Text: normalized selected string is included in the task's `accepted` list.

The caller passes this precomputed boolean into `submitAnswer`.

## 3. Integration findings

- The demo does not import or call `answer-evaluator.mjs`.
- The demo does not provide `responsePath`, stable part IDs, multi-part response serialization, or per-axis evaluation results.
- The current demo therefore does not establish the UI payload contract for TO BE A1 exercises B1–B8.
- The proposed part IDs and response paths in the Set B mapping remain mapping proposals; they are not verified against a live TO BE A1 learner interface.
- The demo's existing caller-supplied correctness boolean must not be treated as evidence that the new deterministic evaluator is integrated.

## 4. Consequence for Set B

The evaluator and classifier can test authored descriptors independently of the UI, but Set B cannot be marked learner-deliverable until the actual TO BE A1 interface is available and its submitted payloads are inspected.

Required future verification:
1. Confirm stable choice option IDs and whether selected text or selected ID is canonical.
2. Confirm whether B1's two parts are submitted together and how each part is keyed.
3. Confirm whether B3 sends only blank values or complete rendered sentences.
4. Confirm whether B4 sends full corrected sentences or targeted correction tokens.
5. Confirm whether B6 sends full sentences or contracted tokens.
6. Verify raw response preservation and immutable event linkage through the Runtime boundary.

## 5. Scope and change control

This audit is observational. It does not change `core-demo.html`, Runtime behavior, the Content Library source package, production, or `main`.
