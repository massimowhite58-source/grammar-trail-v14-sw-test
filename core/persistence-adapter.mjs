/**
 * Grammar Trail — in-memory persistence adapter test double v0.2.
 *
 * Deliberately NOT durable storage and must not be wired into the UI.
 * Exercises separation between immutable Learning Events, mutable User Facts,
 * disposable snapshots, and independently clearable versioned Content Cache.
 */
const clone = (value) => value === undefined ? undefined : JSON.parse(JSON.stringify(value));

function canonical(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return "[" + value.map(canonical).join(",") + "]";
  return "{" + Object.keys(value).sort().map((key) => JSON.stringify(key) + ":" + canonical(value[key])).join(",") + "}";
}

function validDate(value) {
  return typeof value === "string" && !Number.isNaN(Date.parse(value));
}

function validateEvent(event) {
  if (!event || typeof event !== "object" || Array.isArray(event)) return "EVENT_MUST_BE_OBJECT";
  for (const key of ["eventId", "type", "occurredAt", "schemaVersion", "coreVersion"]) {
    if (event[key] === undefined || event[key] === null || event[key] === "") return "REQUIRED_FIELD_MISSING:" + key;
  }
  if (typeof event.eventId !== "string" || typeof event.type !== "string") return "INVALID_EVENT_FIELD_TYPE";
  if (!Number.isInteger(event.schemaVersion) || event.schemaVersion < 1) return "INVALID_SCHEMA_VERSION";
  if (typeof event.coreVersion !== "string") return "INVALID_CORE_VERSION";
  if (!validDate(event.occurredAt)) return "INVALID_OCCURRED_AT";
  return null;
}

function validateUserFact(fact) {
  if (!fact || typeof fact !== "object" || Array.isArray(fact)) return "USER_FACT_MUST_BE_OBJECT";
  for (const key of ["id", "userId", "type", "source", "createdAt", "updatedAt", "status"]) {
    if (fact[key] === undefined || fact[key] === null || fact[key] === "") return "USER_FACT_REQUIRED_FIELD_MISSING:" + key;
  }
  if (typeof fact.id !== "string" || typeof fact.userId !== "string" ||
      typeof fact.type !== "string" || typeof fact.source !== "string" ||
      typeof fact.status !== "string") return "INVALID_USER_FACT_FIELD_TYPE";
  if (!validDate(fact.createdAt) || !validDate(fact.updatedAt)) return "INVALID_USER_FACT_TIMESTAMP";
  if (typeof fact.confidence !== "number" || fact.confidence < 0 || fact.confidence > 1) return "INVALID_USER_FACT_CONFIDENCE";
  if (!Object.prototype.hasOwnProperty.call(fact, "value")) return "USER_FACT_VALUE_REQUIRED";
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

export class UserFactConflictError extends Error {
  constructor(factId) {
    super("USER_FACT_SCOPE_CONFLICT:" + factId);
    this.name = "UserFactConflictError";
    this.code = "USER_FACT_SCOPE_CONFLICT";
    this.factId = factId;
  }
}

export class InMemoryPersistenceAdapter {
  #events = new Map();
  #userFacts = new Map();
  #snapshots = new Map();
  #contentCache = new Map();

  async appendEvents(events) {
    if (!Array.isArray(events)) throw new TypeError("EVENT_BATCH_MUST_BE_ARRAY");
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
    return this.appendEvents(events);
  }

  /**
   * User Facts are mutable user data, distinct from immutable Learning Events.
   * A fact is addressed by (userId, id); changing owner is never an update.
   */
  async writeUserFact(fact) {
    const invalid = validateUserFact(fact);
    if (invalid) throw new TypeError(invalid);
    const key = fact.userId + "::" + fact.id;
    const existing = this.#userFacts.get(key);
    if (existing && existing.userId !== fact.userId) throw new UserFactConflictError(fact.id);
    this.#userFacts.set(key, clone(fact));
    return { written: true, updated: Boolean(existing) };
  }

  async readUserFacts(userId) {
    if (typeof userId !== "string" || !userId) throw new TypeError("USER_ID_REQUIRED");
    return [...this.#userFacts.values()]
      .filter((fact) => fact.userId === userId)
      .map(clone);
  }

  async readUserFact(userId, factId) {
    if (typeof userId !== "string" || !userId) throw new TypeError("USER_ID_REQUIRED");
    const fact = this.#userFacts.get(userId + "::" + factId);
    return fact ? clone(fact) : null;
  }

  /**
   * Cache keys include package ID and version. Cache clear is deliberately
   * unable to access events, User Facts, snapshots, or long-term history.
   */
  async writeContentCache(packageId, version, packageRecord) {
    if (typeof packageId !== "string" || !packageId ||
        typeof version !== "string" || !version) {
      throw new TypeError("CONTENT_CACHE_ID_AND_VERSION_REQUIRED");
    }
    if (!packageRecord || typeof packageRecord !== "object" || Array.isArray(packageRecord)) {
      throw new TypeError("CONTENT_CACHE_RECORD_MUST_BE_OBJECT");
    }
    if (packageRecord.approved !== true) throw new TypeError("CONTENT_CACHE_PACKAGE_NOT_APPROVED");
    this.#contentCache.set(packageId + "::" + version, {
      packageId, version, packageRecord: clone(packageRecord)
    });
    return { written: true };
  }

  async readContentCache(packageId, version) {
    const record = this.#contentCache.get(packageId + "::" + version);
    return record ? clone(record) : null;
  }

  async clearContentCache() {
    const deleted = this.#contentCache.size;
    this.#contentCache.clear();
    return { deleted };
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
    for (const fact of this.#userFacts.values()) {
      const invalid = validateUserFact(fact);
      if (invalid) return { valid: false, code: invalid, factId: fact.id };
    }
    return {
      valid: true,
      eventCount: ids.size,
      userFactCount: this.#userFacts.size,
      snapshotCount: this.#snapshots.size,
      contentCacheCount: this.#contentCache.size
    };
  }

  /** Test-only helper: snapshots are disposable; source events remain untouched. */
  async deleteSnapshot(snapshotId) {
    return this.#snapshots.delete(snapshotId);
  }
}
