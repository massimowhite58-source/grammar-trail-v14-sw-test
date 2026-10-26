/**
 * Grammar Trail — minimal browser-native IndexedDB adapter (event vertical slice).
 *
 * Isolated prototype only: not wired to UI and not yet a complete replacement
 * for InMemoryPersistenceAdapter. Browser tests are required before acceptance.
 */
export class PersistenceFailureError extends Error {
  constructor(operation, code = "STORAGE_UNAVAILABLE", cause) {
    super(`${code}:${operation}`, cause === undefined ? undefined : { cause });
    this.name = "PersistenceFailureError";
    this.code = code;
    this.operation = operation;
  }
}

export class PersistenceConflictError extends Error {
  constructor(eventId) {
    super(`EVENT_ID_CONTENT_CONFLICT:${eventId}`);
    this.name = "PersistenceConflictError";
    this.code = "EVENT_ID_CONTENT_CONFLICT";
    this.eventId = eventId;
  }
}

const clone = (value) => structuredClone(value);
const validDate = (value) => typeof value === "string" && !Number.isNaN(Date.parse(value));
function canonical(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`).join(",")}}`;
}
function validateEvent(event) {
  if (!event || typeof event !== "object" || Array.isArray(event)) return "EVENT_MUST_BE_OBJECT";
  for (const key of ["eventId", "type", "occurredAt", "schemaVersion", "coreVersion", "userId", "deviceId"]) {
    if (event[key] === undefined || event[key] === null || event[key] === "") return `REQUIRED_FIELD_MISSING:${key}`;
  }
  if (typeof event.eventId !== "string" || typeof event.type !== "string" ||
      typeof event.userId !== "string" || typeof event.deviceId !== "string") return "INVALID_EVENT_FIELD_TYPE";
  if (!Number.isInteger(event.schemaVersion) || event.schemaVersion < 1) return "INVALID_SCHEMA_VERSION";
  if (typeof event.coreVersion !== "string") return "INVALID_CORE_VERSION";
  if (!validDate(event.occurredAt)) return "INVALID_OCCURRED_AT";
  return null;
}

function requestResult(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("IDB_REQUEST_FAILED"));
  });
}

function transactionDone(transaction) {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onabort = () => reject(transaction.error ?? new Error("IDB_TRANSACTION_ABORTED"));
    transaction.onerror = () => reject(transaction.error ?? new Error("IDB_TRANSACTION_FAILED"));
  });
}

export class IndexedDBEventAdapter {
  #db;
  #closed = false;

  constructor(database) {
    if (!database || typeof database.transaction !== "function") throw new TypeError("VALID_IDB_DATABASE_REQUIRED");
    this.#db = database;
  }

  static open({ indexedDB = globalThis.indexedDB, databaseName = "grammar-trail-local", version = 1 } = {}) {
    if (!indexedDB || typeof indexedDB.open !== "function") {
      return Promise.reject(new PersistenceFailureError("open", "INDEXEDDB_UNAVAILABLE"));
    }
    return new Promise((resolve, reject) => {
      let request;
      try { request = indexedDB.open(databaseName, version); }
      catch (error) { reject(new PersistenceFailureError("open", "STORAGE_UNAVAILABLE", error)); return; }
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains("learningEvents")) {
          const store = db.createObjectStore("learningEvents", { keyPath: "eventId" });
          store.createIndex("byUserOccurredAtEventId", ["userId", "occurredAt", "eventId"], { unique: false });
          store.createIndex("byUserDevice", ["userId", "deviceId"], { unique: false });
        }
      };
      request.onsuccess = () => {
        const db = request.result;
        db.onversionchange = () => db.close();
        resolve(new IndexedDBEventAdapter(db));
      };
      request.onerror = () => reject(new PersistenceFailureError("open", "STORAGE_UNAVAILABLE", request.error));
      request.onblocked = () => reject(new PersistenceFailureError("open", "DATABASE_UPGRADE_BLOCKED"));
    });
  }

  async appendEvents(events) {
    this.#assertOpen("appendEvents");
    if (!Array.isArray(events)) throw new TypeError("EVENT_BATCH_MUST_BE_ARRAY");
    for (const event of events) {
      const invalid = validateEvent(event);
      if (invalid) throw new TypeError(invalid);
    }
    const tx = this.#db.transaction(["learningEvents"], "readwrite");
    const done = transactionDone(tx);
    const store = tx.objectStore("learningEvents");
    let appended = 0;
    let duplicates = 0;
    try {
      for (const event of events) {
        const existing = await requestResult(store.get(event.eventId));
        if (existing !== undefined) {
          if (canonical(existing) !== canonical(event)) throw new PersistenceConflictError(event.eventId);
          duplicates += 1;
        } else {
          await requestResult(store.add(clone(event)));
          appended += 1;
        }
      }
      await done;
      return { appended, duplicates };
    } catch (error) {
      try { tx.abort(); } catch {}
      try { await done; } catch {}
      if (error instanceof PersistenceConflictError || error instanceof TypeError) throw error;
      throw new PersistenceFailureError("appendEvents", error?.name === "QuotaExceededError" ? "STORAGE_QUOTA_EXCEEDED" : "STORAGE_UNAVAILABLE", error);
    }
  }

  async getEventById(eventId, scope = {}) {
    this.#assertOpen("getEventById");
    if (typeof eventId !== "string" || !eventId) throw new TypeError("EVENT_ID_REQUIRED");
    if (typeof scope.userId !== "string" || !scope.userId) throw new TypeError("EVENT_QUERY_USER_ID_REQUIRED");
    if (scope.deviceId !== undefined && (typeof scope.deviceId !== "string" || !scope.deviceId)) {
      throw new TypeError("INVALID_EVENT_QUERY_FIELD:deviceId");
    }
    try {
      const tx = this.#db.transaction(["learningEvents"], "readonly");
      const done = transactionDone(tx);
      const event = await requestResult(tx.objectStore("learningEvents").get(eventId));
      await done;
      if (!event || event.userId !== scope.userId || (scope.deviceId !== undefined && event.deviceId !== scope.deviceId)) return null;
      return clone(event);
    } catch (error) {
      if (error instanceof TypeError) throw error;
      throw new PersistenceFailureError("getEventById", "STORAGE_UNAVAILABLE", error);
    }
  }

  async readEvents(query = {}) {
    this.#assertOpen("readEvents");
    if (!query || typeof query !== "object" || Array.isArray(query)) throw new TypeError("EVENT_QUERY_MUST_BE_OBJECT");
    if (typeof query.userId !== "string" || !query.userId) throw new TypeError("EVENT_QUERY_USER_ID_REQUIRED");
    for (const key of ["deviceId", "sessionId", "knowledgeItemId", "from", "to", "cursor"]) {
      if (query[key] !== undefined && (typeof query[key] !== "string" || !query[key])) throw new TypeError(`INVALID_EVENT_QUERY_FIELD:${key}`);
    }
    if (query.from !== undefined && !validDate(query.from)) throw new TypeError("INVALID_EVENT_QUERY_FROM");
    if (query.to !== undefined && !validDate(query.to)) throw new TypeError("INVALID_EVENT_QUERY_TO");
    if (query.from !== undefined && query.to !== undefined && Date.parse(query.from) >= Date.parse(query.to)) throw new TypeError("INVALID_EVENT_QUERY_RANGE");
    if (query.limit !== undefined && (!Number.isInteger(query.limit) || query.limit < 1 || query.limit > 500)) throw new TypeError("INVALID_EVENT_QUERY_LIMIT");
    try {
      const tx = this.#db.transaction(["learningEvents"], "readonly");
      const done = transactionDone(tx);
      const all = await requestResult(tx.objectStore("learningEvents").getAll());
      await done;
      let events = all.filter((event) => event.userId === query.userId)
        .filter((event) => query.deviceId === undefined || event.deviceId === query.deviceId)
        .filter((event) => query.sessionId === undefined || event.sessionId === query.sessionId)
        .filter((event) => query.knowledgeItemId === undefined || event.knowledgeItemId === query.knowledgeItemId)
        .filter((event) => query.from === undefined || Date.parse(event.occurredAt) >= Date.parse(query.from))
        .filter((event) => query.to === undefined || Date.parse(event.occurredAt) < Date.parse(query.to))
        .sort((a, b) => Date.parse(a.occurredAt) - Date.parse(b.occurredAt) || a.eventId.localeCompare(b.eventId));
      if (query.cursor !== undefined) {
        const index = events.findIndex((event) => event.eventId === query.cursor);
        if (index < 0) throw new TypeError("INVALID_EVENT_CURSOR");
        events = events.slice(index + 1);
      }
      if (query.limit !== undefined) events = events.slice(0, query.limit);
      return events.map(clone);
    } catch (error) {
      if (error instanceof TypeError) throw error;
      throw new PersistenceFailureError("readEvents", "STORAGE_UNAVAILABLE", error);
    }
  }

  close() {
    if (!this.#closed) this.#db.close();
    this.#closed = true;
  }

  #assertOpen(operation) {
    if (this.#closed) throw new PersistenceFailureError(operation, "DATABASE_CLOSED");
  }
}
