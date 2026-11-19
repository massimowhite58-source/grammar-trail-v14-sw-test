# Implementation Guide & Data Contracts

## Recommended order
1. Load brand assets and foundations; confirm theme tokens and font loading.
2. Implement application shell and responsive navigation.
3. Implement base/composite/feedback component primitives.
4. Implement Learning UI and session lifecycle against engine-provided contracts.
5. Implement Dashboard, Knowledge Map and Progress from real engine data.
6. Implement Settings/Profile with approved exclusions.
7. Implement Empty/Error/Loading/Success states.
8. Integrate Animated Entry v1.2 and test lifecycle.
9. Run visual, responsive, accessibility and runtime QA.

## Engine-to-UI contract
Engine owns content/task selection, answer evaluation, partial correctness, learning state, mastery calculation, topic relationships, adaptation, recommendation rationale, next step and analytics signals. UI owns rendering, user input, accessibility, state feedback, navigation and presentation. Do not recreate engine rules in the front end.

## Data integrity
No fabricated progress/activity values. No invented mastery formula or thresholds. Recommendations require actual engine signals and an explainable reason. Keep Activity and Mastery Trend graphs distinct. Keep content library independent of UI structure and legacy lesson count. Display only Grammar, Vocabulary, Reading and Writing as Skills.

## CSS
Use `02-Foundations/mami-ui-foundations-v1_2-handoff.css` as reconciled starting point; retain v1.1 for traceability. Confirm contrast and font availability in the actual product.

## Asset provenance
The Brand Kit PDF and source ZIP are part of the original handoff. The v0.2 SVG is a reconstructed symbol accepted for Animated Entry, not a replacement for the full original lockup. For a production-quality complete lockup, obtain original vector artwork; do not upscale a raster.

## Definition of done
Approved specs represented in working UI; engine-fed values trace to real contracts; Dark/Light contrast and accessibility verified; responsive matrix and 200% zoom passed; keyboard/screen-reader checks completed; error/loading/empty/recovery states tested; Animated Entry tested in supported browsers and reduced-motion mode; deviations documented and approved.