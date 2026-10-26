# Grammar Trail — Persistence Boundary Contract v0.1

Status: **Design contract only. No durable adapter is implemented by this document.**

## 1. Purpose
Define the boundary between the deterministic Learning Core and a future local or remote persistence adapter without selecting a database, backend, or vendor.

The contract follows Data Model v1.1:
- Learning history, User Facts, and long-term history are stored from the beginning.
- Learning Events are immutable historical facts.
- Runtime state and snapshots are derived and recalculable.
- Offline synchronization merges event histories; it does not replace one device's progress with another's.
- No higher layer may destroy information represented by a lower layer.

## 2. Storage categories
Keep these categories logically separate even if a future adapter uses one database:
1. **Learning Events** — append-only record of learner actions and system facts.
2. **User Facts** — user-provided or user-confirmed facts, with provenance and lifecycle metadata.
3. **Derived Snapshots** — rebuildable projections such as current phase, counts, and last support level.
4. **Content Cache** — approved, versioned content packages only; independent of learning history.
5. **Sync Metadata** — device identity, last successful sync marker, and conflict diagnostics. This is operational metadata, not learning truth.

Deleting or refreshing Content Cache must never delete Learning Events, User Facts, or long-term history.

## 3. Minimum Learning Event envelope
Required fields:
- `eventId`: stable globally unique identifier; never reused.
- `type`: registered event type.
- `occurredAt`: timestamp when the fact occurred, not when it synced.
- `schemaVersion`: version of the event envelope/payload schema.
- `coreVersion`: deterministic engine version that emitted the event.
- `sessionId`: session identity where applicable.
- `knowledgeItemId`: learning target where applicable.
- `contentVersion`: exact content version used where applicable.
- `algorithmVersion`: decision/evaluation algorithm version where applicable.
- `payload`: event-specific factual data, validated by its type schema.

The current prototype flattens some payload fields into the event object. The adapter boundary must tolerate the current shape during v0.1, but schema normalization/migration must be explicit and versioned; do not silently rewrite stored records.

## 4. Required adapter operations
The future adapter must expose equivalent behavior, independent of its eventual technology:
- `appendEvents(events)`: validate and append new events; never update or delete existing event IDs.
- `readEvents(query)`: return events by user/session/target/time range with stable pagination.
- `getEventById(eventId)`: retrieve one event for idempotency and conflict checks.
- `mergeEvents(incomingEvents)`: union histories by stable event ID; exact duplicates are ignored, conflicting payloads with the same ID are reported and never silently overwritten.
- `readSnapshot(snapshotKey)`: return a derived snapshot only if its source version/watermark is known.
- `writeSnapshot(snapshot)`: replaceable cache operation; never changes or deletes source events.
- `rebuildSnapshot(query)`: replay source events through a versioned projector and return a deterministic state projection.
- `verifyIntegrity(query)`: detect missing required fields, duplicate IDs, invalid schema versions, and impossible/conflicting records.

## 5. Write guarantees
1. Validate the complete batch before committing any event.
2. A failed batch must not leave a partial append.
3. Event IDs are idempotency keys: retrying the same event is safe.
4. Same ID + same canonical event means duplicate; same ID + different event means an integrity conflict requiring explicit handling.
5. Preserve original `occurredAt`, response, correctness, target, content version, and algorithm version.
6. Store the event before acknowledging success to the caller.
7. Never derive correctness from duration alone.
8. Never let a snapshot or sync response overwrite source event history.

## 6. Reconstruction and snapshots
- Event history is the source of truth; snapshots are disposable accelerators.
- Every snapshot records its projector/version and the event watermark or source range used to build it.
- A snapshot is invalid when its source range is unknown, its projector is incompatible, or integrity validation fails.
- Rebuilding from the same ordered set of valid events with the same projector version must yield the same projection.
- Recalibration may create a new interpretation/snapshot version; it must not alter historical events.

## 7. Offline sync and multi-device merge
- Sync exchanges event records, not a single “latest progress” object.
- Merge is set-union by event ID, with explicit conflict reporting.
- Device clocks may be inaccurate; `occurredAt` is evidence, not the sole tie-breaker for correctness or deletion.
- Arrival order must not erase facts. When projection order matters, define a deterministic ordering policy using recorded timestamps plus stable tie-breakers and preserve the original timestamps.
- Sync checkpoints are resumable metadata. A failed sync can be retried without duplicate learning facts.

## 8. Privacy and security boundary
- The adapter accepts a user/device scope and must not mix records across users.
- Do not store credentials, API keys, or secrets in learning event payloads.
- Minimize personal data; User Facts require provenance and a clear lifecycle.
- Export, deletion, retention, and account-removal policies must be defined before public release. Any legally required deletion process must be explicit and audited; it must not be confused with ordinary cache cleanup.
- Do not log raw learner responses or personal facts to general telemetry by default.
- Encryption, authentication, authorization, and recovery guarantees must be specified for whichever storage implementation is chosen later.

## 9. Failure behavior
The adapter must return explicit outcomes for:
- validation rejection;
- storage unavailable/quota exceeded;
- duplicate event;
- event-ID integrity conflict;
- schema-version unsupported;
- partial read or interrupted sync;
- snapshot stale/unavailable;
- permission/authentication failure.

Never convert a persistence failure into silent success. If a learning response cannot be durably recorded, the UI must not imply that it has been safely saved. A future local-first queue may keep a clearly marked pending write, but that is not yet implemented.

## 10. Minimum acceptance tests before UI integration
- Append a valid event and read back the exact same factual payload.
- Retry the same event ID and confirm no duplicate is created.
- Reuse an event ID with a different payload and confirm explicit conflict, not overwrite.
- Reject an invalid batch atomically.
- Rebuild a snapshot from events and compare deterministic output.
- Delete/rebuild a snapshot and prove source events remain unchanged.
- Merge two device event sets in either order and prove the union is identical.
- Simulate quota/storage failure and prove the caller receives an explicit failure.
- Verify cache deletion does not affect learning events or User Facts.
- Verify user/device scoping prevents cross-user reads or writes.

## 11. Explicitly out of scope
- Choosing IndexedDB, SQLite, a hosted database, or a backend vendor.
- Authentication implementation and account lifecycle implementation.
- Background sync and conflict-resolution UI.
- Production encryption and key management.
- Migration of legacy app progress.
- Claiming persistence is implemented or safe for public release.

## Next implementation step
Build a small technology-neutral adapter interface and a test double first. Implement the acceptance tests above against the test double, then choose the smallest local durable implementation compatible with the PWA. Keep production repository untouched until the adapter, migration, and recovery tests pass.
