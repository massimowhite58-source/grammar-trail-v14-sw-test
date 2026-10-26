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
  for (const key of ["eventId", "type", "occurredAt", "schemaVersion", "coreVersion", "userId", "deviceId"]) {
    if (event[key] === undefined || event[key] === null || event[key] === "") return "REQUIRED_FIELD_MISSING:" + key;
  }
  if (typeof event.eventId !== "string" || typeof event.type !== "string" ||
      typeof event.userId !== "string" || !event.userId ||
      typeof event.deviceId !== "string" || !event.deviceId) return "INVALID_EVENT_FIELD_TYPE";
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

export class PersistenceFailureError extends Error {
  constructor(operation, code = "STORAGE_UNAVAILABLE") {
    super(code + ":" + operation);
    this.name = "PersistenceFailureError";
    this.code = code;
    this.operation = operation;
  }
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
  #nextFailures = new Map();

  /** Test-only fault injection. This does not emulate real browser quota behavior. */
  failNextOperation(operation, code = "STORAGE_UNAVAILABLE") {
    if (typeof operation !== "string" || !operation) throw new TypeError("OPERATION_REQUIRED");
    if (typeof code !== "string" || !code) throw new TypeError("FAILURE_CODE_REQUIRED");
    this.#nextFailures.set(operation, code);
  }

  #throwInjectedFailure(operation) {
    if (!this.#nextFailures.has(operation)) return;
    const code = this.#nextFailures.get(operation);
    this.#nextFailures.delete(operation);
    throw new PersistenceFailureError(operation, code);
  }

  async appendEvents(events) {
    this.#throwInjectedFailure("appendEvents");
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

  /**
   * Stable order: occurredAt ascending, then eventId lexicographically.
   * "from" is inclusive and "to" is exclusive. A cursor is the eventId of
   * the last item returned by the previous page for the same query.
   */
  async readEvents(query = {}) {
    this.#throwInjectedFailure("readEvents");
    if (!query || typeof query !== "object" || Array.isArray(query)) {
      throw new TypeError("EVENT_QUERY_MUST_BE_OBJECT");
    }
    if (typeof query.userId !== "string" || !query.userId) {
      throw new TypeError("EVENT_QUERY_USER_ID_REQUIRED");
    }
    for (const key of ["userId", "deviceId", "sessionId", "knowledgeItemId", "from", "to", "cursor"]) {
      if (query[key] !== undefined && (typeof query[key] !== "string" || !query[key])) {
        throw new TypeError("INVALID_EVENT_QUERY_FIELD:" + key);
      }
    }
    if (query.from !== undefined && !validDate(query.from)) throw new TypeError("INVALID_EVENT_QUERY_FROM");
    if (query.to !== undefined && !validDate(query.to)) throw new TypeError("INVALID_EVENT_QUERY_TO");
    if (query.from !== undefined && query.to !== undefined && Date.parse(query.from) >= Date.parse(query.to)) {
      throw new TypeError("INVALID_EVENT_QUERY_RANGE");
    }
    if (query.limit !== undefined && (!Number.isInteger(query.limit) || query.limit < 1 || query.limit > 500)) {
      throw new TypeError("INVALID_EVENT_QUERY_LIMIT");
    }

    let events = [...this.#events.values()].map(({ event }) => event)
      .filter((event) => query.userId === undefined || event.userId === query.userId)
      .filter((event) => query.deviceId === undefined || event.deviceId === query.deviceId)
      .filter((event) => query.sessionId === undefined || event.sessionId === query.sessionId)
      .filter((event) => query.knowledgeItemId === undefined || event.knowledgeItemId === query.knowledgeItemId)
      .filter((event) => query.from === undefined || Date.parse(event.occurredAt) >= Date.parse(query.from))
      .filter((event) => query.to === undefined || Date.parse(event.occurredAt) < Date.parse(query.to))
      .sort((left, right) => {
        const timeDifference = Date.parse(left.occurredAt) - Date.parse(right.occurredAt);
        if (timeDifference !== 0) return timeDifference;
        return left.eventId < right.eventId ? -1 : left.eventId > right.eventId ? 1 : 0;
      });

    if (query.cursor !== undefined) {
      const cursorIndex = events.findIndex((event) => event.eventId === query.cursor);
      if (cursorIndex < 0) throw new TypeError("INVALID_EVENT_CURSOR");
      events = events.slice(cursorIndex + 1);
    }
    if (query.limit !== undefined) events = events.slice(0, query.limit);
    return events.map(clone);
  }

  async getEventById(eventId, scope = {}) {
    this.#throwInjectedFailure("getEventById");
    if (typeof scope.userId !== "string" || !scope.userId) throw new TypeError("EVENT_QUERY_USER_ID_REQUIRED");
    if (scope.deviceId !== undefined && (typeof scope.deviceId !== "string" || !scope.deviceId)) {
      throw new TypeError("INVALID_EVENT_QUERY_FIELD:deviceId");
    }
    const record = this.#events.get(eventId);
    if (!record || record.event.userId !== scope.userId ||
        (scope.deviceId !== undefined && record.event.deviceId !== scope.deviceId)) return null;
    return clone(record.event);
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

  async readSnapshot(snapshotId, userId) {
    if (typeof userId !== "string" || !userId) throw new TypeError("SNAPSHOT_USER_ID_REQUIRED");
    return clone(this.#snapshots.get(userId + "::" + snapshotId) ?? null);
  }

  async writeSnapshot(snapshotId, snapshot) {
    if (typeof snapshotId !== "string" || !snapshotId) throw new TypeError("SNAPSHOT_ID_REQUIRED");
    if (!snapshot || typeof snapshot !== "object" || Array.isArray(snapshot)) {
      throw new TypeError("SNAPSHOT_MUST_BE_OBJECT");
    }
    if (typeof snapshot.userId !== "string" || !snapshot.userId) throw new TypeError("SNAPSHOT_USER_ID_REQUIRED");
    this.#snapshots.set(snapshot.userId + "::" + snapshotId, clone(snapshot));
    return { written: true };
  }

  async rebuildSnapshot(snapshotId, projector, query) {
    if (typeof projector !== "function") throw new TypeError("PROJECTOR_REQUIRED");
    if (!query || typeof query !== "object" || typeof query.userId !== "string" || !query.userId) {
      throw new TypeError("SNAPSHOT_QUERY_USER_ID_REQUIRED");
    }
    const events = await this.readEvents(query);
    const projected = await projector(events);
    const snapshot = {
      snapshotId,
      userId: query.userId,
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
  async deleteSnapshot(snapshotId, userId) {
    if (typeof userId !== "string" || !userId) throw new TypeError("SNAPSHOT_USER_ID_REQUIRED");
    return this.#snapshots.delete(userId + "::" + snapshotId);
  }
}
