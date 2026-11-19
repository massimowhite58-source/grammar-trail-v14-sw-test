# MAMI Animated Entry v1.2

Approved composition: approved ribbon geometry v0.2; navy background; gold ribbon; enlarged Massimo Mega Intelligence name; no separate MAMI wordmark in splash lockup. Ribbon reveals left-to-right; brand name follows. Show on fresh app entry, not internal route changes. Reduced-motion users receive a complete static lockup.

## Integration
Place CSS and SVG in the app public assets directory or update paths. Mount overlay on fresh entry only. When app is ready, add is-exiting to .mami-entry; remove overlay from DOM after exit transition. Application controls mount/exit lifecycle; this reference only defines markup and reveal styling.

Verify animation, font rendering, contrast, keyboard/screen-reader behavior and timing in target browsers.

Timing: symbol 1.45 s; brand reveal begins at 1.45 s and lasts 0.9 s; exit 0.3 s. Values may be tuned during browser QA without changing composition or reveal order.