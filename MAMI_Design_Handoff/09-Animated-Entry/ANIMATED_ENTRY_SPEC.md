# Animated Entry v1.2 — approved

- Dark navy background.
- Approved gold ribbon symbol geometry v0.2.
- Enlarged “Massimo Mega Intelligence” directly below the symbol.
- No separate MAMI wordmark in this splash lockup.
- Ribbon reveals left-to-right from the left base; brand name follows in the same direction and style.
- Show on each fresh app entry, not on internal route transitions.
- Mobile adaptation and reduced-motion static alternative.

Runtime mounts overlay on fresh entry, manages readiness/exit, adds is-exiting, then removes it from DOM after transition. HTML is a markup reference, not a complete lifecycle implementation.

Timing values: symbol 1.45 s; brand reveal starts at 1.45 s and lasts 0.9 s; exit 0.3 s. Tune during browser QA without changing approved composition/order.
