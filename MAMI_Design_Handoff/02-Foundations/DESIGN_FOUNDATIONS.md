# Design Foundations

## Principles
- Navy + Gold; Dark by default, Light as alternative.
- Manrope for display/headings; Inter for body; system sans-serif fallback.
- 4 px spacing base.
- Radii: 8 / 14 / 20 / 28 px.
- Main content width up to 1200 px.
- Shared tokens are used by components; avoid duplicated local styles.

## Typography
Scale: 12, 14, 16, 18, 20, 24, 30, 36 px.
Line heights: tight 1.2, normal 1.5, relaxed 1.65.

## Controls and accessibility
Control heights: 36 / 44 / 52 px. Visible focus outline and ring. Color must not be the only status signal. Verify actual contrast pairs in both themes; tokens alone do not mean an accessibility audit has passed.

## Themes
- Dark: deep Navy, light text, Gold accent.
- Light: Ivory/White surfaces, dark text, darker Gold for contrast.
- Semantic tokens retain their meaning across themes.

## Handoff CSS v1.2
Use `mami-ui-foundations-v1_2-handoff.css` as the reconciled starting point. Original v1.1 is retained for traceability. v1.2 adds `--color-accent-strong`, aligns breakpoints to Responsive Design v1.0, and connects `--space-page` to the container width. This is CSS handoff consolidation, not production QA.
