/**
 * Grammar Trail — in-memory persistence adapter test double v0.1.
 *
 * This is deliberately NOT durable storage and must not be wired into the UI.
 * It exercises the persistence contract before choosing IndexedDB or a backend.
 */
const clone = (value) => value === undefined ? undefined : JSON.parse(JSON.stringify(value));

function canonical(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return "[" + value.map(canonical).join(",") + "]";
  return "{" + Object.keys(value).sort().map((key) => JSON.stringify(key) + ":" + canonical(value[key])).join(",") + "}";
}

function validateEvent(event) {
  if (!event || typeof event !== "object" || Array.isArray(event)) return "EVENT_MUST_BE_OBJECT";
  for (const key of ["eventId", "type", "occurredAt", "schemaVersion", "coreVersion"]) {
    if (event[key] === undefined || event[key] === null || event[key] === "") return "REQUIRED_FIELD_MISSING:" + key;
  }
  if (typeof event.eventId !== "string" || typeof event.type !== "string") return "INVALID_EVENT_FIELD_TYPE";
  if (!Number.isInteger(event.schemaVersion) || event.schemaVersion < 1) return "INVALID_SCHEMA_VERSION";
  if (typeof event.coreVersion !== "string") return "INVALID_CORE_VERSION";
  if (Number.isNaN(Date.parse(event.occurredAt))) return "INVALID_OCCURRED_AT";
  return null;
}

export class PersistenceConflictError extends Error {
  constructor(eventId) {
    super("EVENT_ID_CONTENT_CONFLICT:" + eventId);
    this.name = "PersistenceConflictError";
    this.code = "EVENT_ID_CONTENT_CONFLICT";
    this.eventId = eventId;
  }
}

export class InMemoryPersistenceAdapter {
  #events = new Map();
  #snapshots = new Map();

  async appendEvents(events) {
    if (!Array.isArray(events)) throw new TypeError("EVENT_BATCH_MUST_BE_ARRAY");
    // Validate the entire batch and all ID collisions before mutating storage.
    const staged = new Map();
    for (const event of events) {
      const invalid = validateEvent(event);
      if (invalid) throw new TypeError(invalid);
      const id = event.eventId;
      const serialized = canonical(event);
      const batchPrevious = staged.get(id);
      const storedPrevious = this.#events.get(id);
      if ((batchPrevious && batchPrevious.serialized !== serialized) ||
          (storedPrevious && storedPrevious.serialized !== serialized)) {
        throw new PersistenceConflictError(id);
      }
      if (!batchPrevious && !storedPrevious) staged.set(id, { serialized, event: clone(event) });
    }
    for (const [id, record] of staged) this.#events.set(id, record);
    return { appended: staged.size, duplicates: events.length - staged.size };
  }

  async readEvents() {
    return [...this.#events.values()].map(({ event }) => clone(event));
  }

  async getEventById(eventId) {
    const record = this.#events.get(eventId);
    return record ? clone(record.event) : null;
  }

  async mergeEvents(events) {
    // Same atomic and idempotent semantics as append; merge order never overwrites facts.
    return this.appendEvents(events);
  }

  async readSnapshot(snapshotId) {
    return clone(this.#snapshots.get(snapshotId) ?? null);
  }

  async writeSnapshot(snapshotId, snapshot) {
    if (typeof snapshotId !== "string" || !snapshotId) throw new TypeError("SNAPSHOT_ID_REQUIRED");
    if (!snapshot || typeof snapshot !== "object" || Array.isArray(snapshot)) {
      throw new TypeError("SNAPSHOT_MUST_BE_OBJECT");
    }
    this.#snapshots.set(snapshotId, clone(snapshot));
    return { written: true };
  }

  async rebuildSnapshot(snapshotId, projector) {
    if (typeof projector !== "function") throw new TypeError("PROJECTOR_REQUIRED");
    const events = await this.readEvents();
    const projected = await projector(events);
    const snapshot = {
      snapshotId,
      projectorVersion: "test-double-v1",
      sourceEventCount: events.length,
      sourceEventIds: events.map((event) => event.eventId),
      state: clone(projected)
    };
    await this.writeSnapshot(snapshotId, snapshot);
    return clone(snapshot);
  }

  async verifyIntegrity() {
    const ids = new Set();
    for (const [id, record] of this.#events) {
      const invalid = validateEvent(record.event);
      if (invalid) return { valid: false, code: invalid, eventId: id };
      if (ids.has(id) || id !== record.event.eventId) {
        return { valid: false, code: "EVENT_ID_INDEX_MISMATCH", eventId: id };
      }
      if (canonical(record.event) !== record.serialized) {
        return { valid: false, code: "STORED_EVENT_CHANGED", eventId: id };
      }
      ids.add(id);
    }
    return { valid: true, eventCount: ids.size, snapshotCount: this.#snapshots.size };
  }

  /** Test-only helper: snapshots are disposable; source events remain untouched. */
  async deleteSnapshot(snapshotId) {
    return this.#snapshots.delete(snapshotId);
  }
}
