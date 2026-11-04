# Universal Content Package Contract v0.1

## Purpose

One reusable ingestion and validation pipeline for every future Grammar Trail content block: grammar, vocabulary, context, communication, mixed practice, and later language domains. A new block supplies source documents plus a small profile, not a new parser or duplicated runtime logic.

## Separation of responsibilities

1. Content source: authored, versioned Markdown or another explicitly supported source format. It remains the editorial source of truth.
2. Universal ingestion: parses exercise boundaries and preserves every authored section verbatim.
3. Package profile: declares expected IDs, required source documents, required semantic sections, aliases, and exceptional internal structures.
4. Semantic mapping: explicitly maps authored answers, accepted alternatives, evaluation rules, diagnostics, feedback, recovery, skill/hypothesis links, and phase compatibility. No rules are inferred from prose.
5. Core Runtime: evaluates, classifies, persists and delivers only validated/approved content.

## Universal record shape

- Package metadata: packageId, contentVersion, packageStatus, language, level, domain.
- Exercise identity: exerciseId, setId, title.
- Provenance: source.documentPath, source.heading, sourceBody.
- Authored: learnerPrompt, expectedAnswer, acceptedAlternatives, errorPatterns, feedback, recoveryMapping, skillTags, editorialNote.
- sections: complete map of every original section, including package-specific headings.
- Runtime mapping: evaluation, diagnostics, hypothesis/knowledge item links, phase mappings, feedback/recovery policy and mapping version.
- Lifecycle: mappingStatus and package approval state.

The sections map and sourceBody preserve non-standard sections such as multi-part tasks, separate diagnostic subrecords, communication subparts, and future package-specific structures. The adapter does not collapse these into generic fields.

## Profile configuration

A content profile declares:
- requiredDocuments
- expectedExerciseIds or allowed additional exercise policy
- requiredSections and sectionAliases
- specialStructures (for example exact part/subrecord IDs or counts)
- optional taxonomy allowlist/version and content-specific constraints
- set/group resolution policy

A profile contains configuration only; it must not fork parser logic.

## Invariants

- Stable IDs and package versions are required.
- Exact source provenance is mandatory.
- Every original section is preserved.
- Missing, duplicate, unexpected IDs and sections fail validation.
- Unknown diagnostic tags are rejected against the package's own taxonomy.
- Multiple parts and diagnostic subrecords remain children of their authored exercise unless the source explicitly declares separate exercise IDs.
- One task = one hypothesis unless an explicitly approved design decision states otherwise.
- Slow correct answers remain correct; no time-based correctness inference.
- OPEN_RESPONSE remains REVIEW_REQUIRED unless a deterministic authored rubric exists.
- Raw learner response and original ANSWER_SUBMITTED event are immutable.
- Evaluation, diagnostic, feedback, recovery and analytics records are appended, never written over source events.
- Draft/generated/review-required content is not learner-deliverable.
- Runtime phases are never guessed from exercise order or set name.
- Content package parser does not choose the next lesson; Decision Engine retains that responsibility.

## Fast path for future content blocks

1. Add source documents using the supported authored format or template.
2. Add one profile JSON/module with IDs, required documents/sections and special structure declarations.
3. Run the same universal parser, provenance checks, inventory checks and structural tests.
4. Add only content-specific semantic mappings where the authored format requires them.
5. Run the shared evaluator/classifier/persistence suite plus the profile's package tests.

Do not clone the parser, evaluator, diagnostic classifier, or event model for a new grammar, vocabulary, or context block.

## Non-goals

- No AI grading or fuzzy natural-language inference.
- No automatic phase selection.
- No content rewriting or editorial corrections during ingestion.
- No approval of draft content.
- No automatic mastery conclusions from exercise scores.
