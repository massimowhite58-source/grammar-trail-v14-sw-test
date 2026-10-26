# IndexedDB Adapter — Minimal Implementation Plan v0.1

Status: **Design checkpoint; no durable adapter has been implemented by this document.**

## Goal

Replace the in-memory test double with a browser-native local persistence adapter only after its storage and recovery behavior can be tested. Keep it separate from the app UI and production repository.

## Guardrails

- Keep Learning Events immutable and append-only.
- Keep event IDs globally unique. Same ID + same canonical event is an idempotent duplicate; same ID + different content is an explicit conflict.
- Validate the entire event batch before writing it in one IndexedDB read/write transaction.
- Scope all event reads by `userId`; optionally narrow by `deviceId`.
- User Facts are mutable and keyed by `(userId, id)`; do not turn them into Learning Events.
- Snapshots are disposable and keyed by `(userId, snapshotId)`. Rebuild only from the scoped event query; a failed read must never publish a partial snapshot.
- Content Cache is separate, versioned, and accepts only explicitly approved packages.
- Storage, quota, transaction-abort, and unavailable-API errors must reject explicitly; never return success-shaped empty data.
- No UI wiring, backend, cloud sync, authentication implementation, AI provider, or production-repository changes in this stage.

## Storage schema proposal

Database name: `grammar-trail-local`; schema version starts at `1`.

| Object store | Key | Purpose |
|---|---|---|
| `learningEvents` | `eventId` | Immutable historical events; globally unique IDs |
| `userFacts` | `[userId, id]` | Mutable, provenance-bearing user facts |
| `snapshots` | `[userId, snapshotId]` | Disposable derived projections |
| `contentCache` | `[packageId, version]` | Approved, versioned content packages |
| `metadata` | `key` | Schema version and minimal local operational metadata only |

Indexes should be added only when required by tested query paths. Event ordering must be deterministic by `occurredAt`, then `eventId`; implementation must not assume that an index on timestamp alone provides the required tie-breaker.

## Implementation sequence

1. **Event vertical slice:** open/upgrade database, validate and atomically append a batch, handle exact duplicates and ID conflicts, read scoped events in deterministic order, and look up an event with explicit errors.
2. **Browser-level tests:** use native IndexedDB in a browser test harness. Cover reload/reopen persistence, batch atomicity, conflict behavior, user/device scope, and transaction failure paths. Node in-memory tests alone do not prove durability.
3. **Remaining stores:** add User Facts, snapshots, and Content Cache with the same isolation and failure rules; test that clearing cache leaves history and facts intact.
4. **Recovery and compatibility:** test database reopen, schema upgrade, unavailable IndexedDB, quota/transaction failures where practical, and documented recovery behavior.
5. **Only after acceptance:** compare the durable adapter against the in-memory contract tests. Do not connect it to UI until the suite is green and the migration/recovery story is explicit.

## Known limits

- Browser storage may be evicted or cleared by the user/browser; IndexedDB is not a backup.
- IndexedDB does not provide application-level encryption or authorization by itself.
- A transaction can be atomic without guaranteeing protection from all device loss or browser-level failures.
- Durable cursor pagination while concurrent writes occur needs an explicit snapshot/watermark strategy before it is promised.
- Cross-device sync and distributed User Fact conflict resolution remain out of scope.

## Acceptance gate

Do not call the adapter durable/ready until browser tests prove data survives database close/reopen, event writes are atomic, conflicts are explicit, scoped reads do not leak data, failed reads/writes reject, and schema upgrades preserve existing records. Keep the in-memory test double as a separate fast unit-test implementation.
