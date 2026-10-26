# Grammar Trail — Persistence Boundary Contract v0.2

Status: **Design contract only. The adapter in this branch is an in-memory test double, not durable storage.**

## 1. Purpose
Define the boundary between the deterministic Learning Core and a future local or remote persistence adapter without selecting a database, backend, or vendor.

The contract follows Data Model v1.1:
- Learning history, User Facts, and long-term history are stored from the beginning.
- Learning Events and Task Attempts are immutable historical facts.
- User Facts are mutable records with provenance and lifecycle metadata.
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

Deleting or refreshing Content Cache must never delete Learning Events, User Facts, Task Attempts, or long-term history.

## 3. Minimum Learning Event envelope
Required fields:
- `eventId`: stable globally unique identifier; never reused.
- `type`: registered event type.
- `occurredAt`: timestamp when the fact occurred, not when it synced.
- `schemaVersion`: version of the event envelope/payload schema.
- `coreVersion`: deterministic engine version that emitted the event.
- `userId`: required persistence scope for the learner whose history contains the event.
- `deviceId`: required stable local-device identifier for the origin of the event.
- `sessionId`: session identity where applicable.
- `knowledgeItemId`: learning target where applicable.
- `contentVersion`: exact content version used where applicable.
- `algorithmVersion`: decision/evaluation algorithm version where applicable.
- `payload`: event-specific factual data, validated by its type schema.

The current prototype flattens some payload fields into the event object. The adapter boundary must tolerate the current shape during v0.1, but schema normalization/migration must be explicit and versioned; do not silently rewrite stored records.

## 4. User Fact record (Data Model v1.1)
The current agreed fields are:
- `id`: stable fact identifier within a user scope.
- `userId`: owner/scope of the fact.
- `type`: registered fact category.
- `value`: fact value; shape depends on the registered type.
- `source`: provenance, kept distinguishable (for example, user-provided versus user-confirmed).
- `confidence`: numeric confidence in the range 0..1.
- `createdAt`: original creation timestamp.
- `updatedAt`: timestamp of the latest fact update.
- `status`: lifecycle status.

A User Fact is not a Learning Event. Updating a User Fact must not rewrite or delete historical Learning Events. A fact ID is scoped by user; reads must not expose another user's facts. Any future merge/update policy must preserve provenance and must not silently move a fact between users. This test double supports simple scoped writes and reads; it does not yet define distributed User Fact conflict resolution.

## 5. Required adapter operations
The future adapter must expose equivalent behavior, independent of its eventual technology:
- `appendEvents(events)`: validate and append new events; never update or delete existing event IDs.
- `readEvents(query)`: `userId` is mandatory; optionally filter by device/session/target and time range. Sort by `occurredAt` ascending then `eventId` ascending; support stable cursor pagination. The `from` bound is inclusive and `to` is exclusive. A cursor is the last event ID from the previous page and must be reused with the same query filters.
- `getEventById(eventId, scope)`: require `scope.userId`, optionally constrain by `scope.deviceId`; out-of-scope events return not-found semantics. Storage/read failures must throw an explicit error and must not be represented as a missing event. Event IDs are globally unique across users and devices; reusing an ID for different content is an explicit conflict.
- `mergeEvents(incomingEvents)`: union histories by stable event ID; exact duplicates are ignored, conflicting payloads with the same ID are reported and never silently overwritten.
- `writeUserFact(fact)`, `readUserFact(userId, factId)`, `readUserFacts(userId)`: validate and manage mutable User Facts within user scope.
- `writeContentCache(packageId, version, packageRecord)`, `readContentCache(packageId, version)`, `clearContentCache()`: store approved versioned content separately and clear only that cache category.
- `readSnapshot(snapshotId, userId)`: require user scope; snapshots are keyed by `(userId, snapshotId)` and must never be exposed across users.
- `writeSnapshot(snapshotId, snapshot)`: require the snapshot owner `userId`; replaceable cache operation; never changes or deletes source events.
- `rebuildSnapshot(snapshotId, projector, query)`: require `query.userId`, replay only events within that query scope through a versioned projector, and return a deterministic state projection. If reading events fails or is incomplete, rebuilding must fail explicitly and must not publish a partial snapshot.
- `verifyIntegrity(query)`: detect missing required fields, duplicate IDs, invalid schema versions, and impossible/conflicting records.

The test double implements only a subset of the future contract. It requires user/device identity on persisted events and user scope on event reads; it tests device filtering, user-scoped snapshots, and explicit read failures during snapshot reconstruction. These are adapter-level test guarantees only; durable storage, durable cursor semantics across concurrent writes, cryptographic/authorization guarantees, sync, and distributed conflict resolution are not implemented.

## 6. Write guarantees
1. Validate the complete event batch before committing any event.
2. A failed event batch must not leave a partial append.
3. Event IDs are idempotency keys: retrying the same event is safe.
4. Same ID + same canonical event means duplicate; same ID + different event means an integrity conflict requiring explicit handling.
5. Preserve original `occurredAt`, response, correctness, target, content version, and algorithm version.
6. Store the event before acknowledging success to the caller.
7. Never derive correctness from duration alone.
8. Never let a snapshot or sync response overwrite source event history.
9. User Facts are mutable, but their provenance and original creation timestamp must be preserved by the eventual update policy.
10. Clearing Content Cache must not modify any other storage category.

## 7. Reconstruction and snapshots
- Event history is the source of truth; snapshots are disposable accelerators.
- Every snapshot records its projector/version and the event watermark or source range used to build it.
- A snapshot is invalid when its source range is unknown, its projector is incompatible, or integrity validation fails.
- Rebuilding from the same ordered set of valid events with the same projector version must yield the same projection.
- Recalibration may create a new interpretation/snapshot version; it must not alter historical events.

## 8. Offline sync and multi-device merge
- Sync exchanges event records, not a single “latest progress” object.
- Merge is set-union by event ID, with explicit conflict reporting.
- Device clocks may be inaccurate; `occurredAt` is evidence, not the sole tie-breaker for correctness or deletion.
- Arrival order must not erase facts. When projection order matters, define a deterministic ordering policy using recorded timestamps plus stable tie-breakers and preserve the original timestamps.
- Sync checkpoints are resumable metadata. A failed sync can be retried without duplicate learning facts.
- User Fact conflict resolution across devices is not specified yet and must not be silently inferred from the event merge rule.

## 9. Privacy and security boundary
- The adapter requires user and device scope on each persisted Learning Event. Event reads require user scope and may be narrowed to one device; they must not mix records across users or expose events outside the requested scope.
- Do not store credentials, API keys, or secrets in learning event payloads.
- Minimize personal data; User Facts require provenance and a clear lifecycle.
- Export, deletion, retention, and account-removal policies must be defined before public release. Any legally required deletion process must be explicit and audited; it must not be confused with ordinary cache cleanup.
- Do not log raw learner responses or personal facts to general telemetry by default.
- Encryption, authentication, authorization, and recovery guarantees must be specified for whichever storage implementation is chosen later.

## 10. Failure behavior
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

## 11. Minimum acceptance tests before UI integration
- Append a valid event and read back the exact same factual payload.
- Retry the same event ID and confirm no duplicate is created.
- Reuse an event ID with a different payload and confirm explicit conflict, not overwrite.
- Reject an invalid batch atomically.
- Rebuild a snapshot from events and compare deterministic output.
- Delete/rebuild a snapshot and prove source events remain unchanged.
- Merge two device event sets in either order and prove the union is identical.
- Simulate quota/storage failure and prove the caller receives an explicit failure without partial event writes. (This is test-double fault injection, not a real browser quota test.)\n- Verify stable event ordering, scoped/time-range filtering, cursor pagination, and invalid cursor/limit rejection.
- Reject events missing user/device scope; require user-scoped event reads and verify device filtering does not leak records.
- Verify cache deletion does not affect learning events or User Facts.
- Verify snapshots with the same ID are isolated by user and snapshot rebuild uses only that user’s events.
- Verify failed event reads abort snapshot rebuild without publishing a partial snapshot; lookup failures must not be reported as missing events.
- Verify user/device scoping prevents cross-user reads or writes.
- Verify User Facts retain provenance, validate confidence, and remain scoped to their user.
- Verify updating a User Fact does not rewrite historical Learning Events.
- Verify only approved, versioned content packages enter Content Cache.

## 12. Explicitly out of scope
- Choosing IndexedDB, SQLite, a hosted database, or a backend vendor.
- Authentication implementation and account lifecycle implementation.
- Background sync and conflict-resolution UI.
- Production encryption and key management.
- Migration of legacy app progress.
- Claiming persistence is implemented or safe for public release.

## Next implementation step
Keep the in-memory test double isolated. Extend acceptance tests until category separation, validation, and scope boundaries are covered. Then choose the smallest local durable adapter compatible with the PWA. Keep production repository untouched until adapter, migration, and recovery tests pass.
