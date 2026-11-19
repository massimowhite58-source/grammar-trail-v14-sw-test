# Empty, Error & Loading States v1.0

## Loading
Skeleton, Spinner, Progress Indicator only when real progress exists, Inline Loading. Preserve already displayed content; no infinite loading or fake percentages.

## Empty
First Use, No Results, No Activity, No Recommendations, No Related Topics, No Notifications. Explain the reason and the next useful action.

## Errors
Network, Server, Validation, Authentication, Permission, Data, Not Found, Session. Preserve user input and progress where possible; provide safe retry.

## Success and confirmation
Toast, Inline Success, Success Screen. Confirm irreversible/risky actions: delete account, sign out all devices, cancel unfinished session with unsaved data, settings reset if that feature is introduced.

## Recovery
Preserve available state, retry safe operations, idempotent submission, explain server conflicts. Support keyboard, screen readers and reduced motion.