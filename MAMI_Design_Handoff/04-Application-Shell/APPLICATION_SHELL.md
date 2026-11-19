# Application Shell Detailed Design v1.0

- Desktop: sidebar, topbar, main content. Sidebar 248 px; topbar 68 px; content max width 1200 px.
- Tablet: collapsed icon rail, 76 px.
- Mobile: hide sidebar; compact topbar 60 px; fixed bottom navigation with safe-area and touch support.
- Topbar: breadcrumbs, search, notifications, profile, theme switcher. All controls need default, hover, focus, active and disabled states.
- Navigation concept: Home, Learning, Library, Knowledge Map, Progress, Settings/Profile. Final taxonomy remains open where not explicitly fixed.
- Active navigation uses restrained Gold accent.
- Core Lab is an internal technical prototype, not a user-facing product section.
- Shell must not depend on number, format or structure of learning units.
