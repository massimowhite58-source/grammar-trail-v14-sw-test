# QA Plan & Design Audit

Final Visual QA v1.0 is a specification audit, not runtime QA and not evidence that the coded app has passed tests.

## Viewports
320×568, 390×844, 768×1024, 1440×900.

## Checks
No unintended horizontal overflow; readable text; usable navigation/actions; no overlapping cards/components; correct touch targets, forms, charts and modal boundaries; rotation, focus, keyboard navigation, reduced motion; Dark/Light; browser zoom 200%; long labels/content; empty/error states; slow connection; touch/keyboard; resize state.

## Severity
P0 Critical; P1 High; P2 Medium; P3 Low.

## Still required after implementation
Real contrast audit for both themes; interactive component states; keyboard/screen-reader navigation; browser/runtime behavior; Animated Entry lifecycle and font rendering; engine-fed data, error states and recovery.
