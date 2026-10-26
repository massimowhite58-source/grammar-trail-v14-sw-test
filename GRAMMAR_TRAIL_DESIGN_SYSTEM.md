# Grammar Trail Design System v0.1

Status: **Approved visual direction; initial token specification.** Core Lab is the visual reference. This document is a working contract for new screens, not a claim that every existing screen has been migrated.

## Principles
1. **Clarity before decoration.** The active learning task is the visual focal point.
2. **Readable explanatory text.** Explanations beneath prompts must be comfortably readable on laptop and mobile, with strong contrast against the surface.
3. **One product, contextual layouts.** Reuse components and tokens, but let learning, progress, knowledge map, and settings optimize for their specific jobs.
4. **Responsive by default.** No horizontal overflow; content width stays comfortable on desktop and controls remain touch-friendly on mobile.
5. **Visible states.** Correct, incorrect, caution, unavailable, and completed states must be distinguishable by more than color alone.
6. **Calm feedback.** Errors are information for recovery, never shame or punishment.

## Color roles
- Brand/navy: `#000080` — primary actions, headings, strong text where contrast is sufficient.
- Blue: `#8080FF` — selected states, progress, interactive accents; avoid small body text on white.
- White: `#FFFFFF` — primary surfaces and text on dark surfaces.
- Neutral surfaces: light lavender/grey for cards and feedback backgrounds.
- Success/error colors: restrained background tints plus explicit text or icon labels.
- Accent peach `#f2c9b3`: decorative accent only where contrast passes; never use as small text on white.

## Typography and readability
- Body copy: target 16–18 CSS px on desktop and mobile; explanatory feedback should be at least 16 px, preferably 17–18 px.
- Body line-height: 1.5–1.65.
- Explanation text: dark navy/near-black on a light surface; avoid low-opacity grey and avoid reducing font size to fit.
- Secondary metadata may be smaller (minimum 14 px) but must remain readable.
- Headings should use a clear hierarchy; avoid dense all-caps labels for explanatory content.
- Long examples wrap naturally and do not cause horizontal scrolling.

## Components
- **Cards:** rounded corners, subtle border, consistent padding; one clear purpose per card.
- **Buttons:** consistent height and radius; visible focus ring; touch target ideally at least 44×44 px. Primary action is visually distinct; secondary actions remain legible.
- **Feedback panel:** readable body-sized text, sufficient padding and contrast. Good/bad state must include explanatory text, not color alone.
- **Phase/status pill:** concise state indicator; never substitute it for a full explanation.
- **Progress:** shows measurable progress and has an accessible textual equivalent.
- **Forms:** labels remain visible; focus and validation states are clear.

## Layout
- Keep the main learning column at a comfortable reading width (Core Lab currently uses a maximum width around 760 px).
- On desktop, use available width without stretching paragraphs across the whole screen.
- On mobile, keep 16 px or more side padding, prevent clipped controls, and use a single-column layout where two columns become cramped.
- Keep vertical spacing predictable; do not use empty space to disguise missing functionality.

## Accessibility and QA checklist
- Check 390 px mobile, 768 px tablet, and 1280–1440 px desktop widths.
- Verify keyboard focus visibility and logical reading order.
- Verify body and feedback contrast; do not rely on color alone.
- Test long prompts, long answers, and translated strings.
- Verify no horizontal overflow, clipped buttons, or fake/inert controls.
- Do not claim a screen is verified on iPhone/MacBook unless tested on that device.

## Current action
- Core Lab feedback/explanatory text uses 16–18 px sizing, strong navy contrast, and improved line-height.
- The active question prompt uses navy text (`#000080`), semibold weight, 19.2 px sizing, and 1.6 line-height to stand out from surrounding metadata. Apply the same prompt treatment to future learning screens.
- Treat both treatments as the baseline for future explanatory copy and question prompts.
