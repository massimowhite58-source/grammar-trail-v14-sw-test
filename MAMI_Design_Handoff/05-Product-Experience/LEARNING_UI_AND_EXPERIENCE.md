# Learning UI & Learning Experience v1.0

## Core components
Lesson Card; Exercise Container; Answer Input; Answer Validation; Hint System; Explanation Panel; Learning Feedback.

## Session flow
Start Session → Learning Context → Exercise → User Response → Validation → Feedback → Adaptation → Session Summary.

## Engine / UI contract
Engine owns task selection, answer evaluation, partial correctness, learning state, mastery, adaptation, recommendation rationale and next step. UI renders context, collects input and displays engine-provided feedback. Do not recreate adaptation or mastery rules in the UI.

## Answer states
Not started; In progress; Waiting for answer; Answer submitted; Correct; Incorrect; Partial correctness; Hint requested; Explanation opened; Completed.

## Behavior
- Correct: confirm and show next step.
- Incorrect: treat as a learning signal, not punishment.
- Partial: distinguish what is already correct from what needs work.
- Repeated errors: display hint/explanation/retry when instructed by the engine.
- Support interruption/resume, progress preservation, safe retry, processing state and double-submit protection.

## Skills
Display only Grammar, Vocabulary, Reading, Writing. Speaking and Listening are not available features and must not be shown as available Skills.
