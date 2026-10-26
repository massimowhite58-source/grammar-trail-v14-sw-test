import test from "node:test";
import assert from "node:assert/strict";
import { InMemoryPersistenceAdapter, PersistenceConflictError, PersistenceFailureError } from "./persistence-adapter.mjs";

const event = (eventId, overrides = {}) => ({
  eventId,
  type: "ANSWER_SUBMITTED",
  occurredAt: "2026-10-27T10:00:00.000Z",
  schemaVersion: 1,
  coreVersion: "0.1.0",
  userId: "user-1",
  deviceId: "device-1",
  sessionId: "session-1",
  knowledgeItemId: "ki-present-simple",
  correct: true,
  response: { selectedIndex: 1 },
  ...overrides
});

const userFact = (id, overrides = {}) => ({
  id,
  userId: "user-1",
  type: "learning_preference",
  value: { preferredSessionMinutes: 10 },
  source: "user_confirmed",
  confidence: 1,
  createdAt: "2026-10-01T10:00:00.000Z",
  updatedAt: "2026-10-01T10:00:00.000Z",
  status: "active",
  ...overrides
});

test("append/read preserves the complete event payload", async () => {
  const store = new InMemoryPersistenceAdapter();
  const source = event("evt-1", { response: { selectedIndex: 1, note: "exact payload" } });
  await store.appendEvents([source]);
  source.response.note = "mutated after write";
  assert.deepEqual(await store.getEventById("evt-1", { userId: "user-1" }), event("evt-1", { response: { selectedIndex: 1, note: "exact payload" } }));
  assert.deepEqual(await store.readEvents({ userId: "user-1" }), [event("evt-1", { response: { selectedIndex: 1, note: "exact payload" } })]);
});

test("same ID and same canonical event is an idempotent duplicate", async () => {
  const store = new InMemoryPersistenceAdapter();
  const first = event("evt-1");
  assert.deepEqual(await store.appendEvents([first]), { appended: 1, duplicates: 0 });
  assert.deepEqual(await store.appendEvents([{ ...first, response: { selectedIndex: 1 } }]), { appended: 0, duplicates: 1 });
  assert.equal((await store.readEvents({ userId: "user-1" })).length, 1);
});

test("same ID with different content is an explicit conflict and never overwrites", async () => {
  const store = new InMemoryPersistenceAdapter();
  await store.appendEvents([event("evt-1")]);
  await assert.rejects(store.appendEvents([event("evt-1", { correct: false })]), (error) => {
    assert.ok(error instanceof PersistenceConflictError);
    assert.equal(error.code, "EVENT_ID_CONTENT_CONFLICT");
    return true;
  });
  assert.equal((await store.getEventById("evt-1", { userId: "user-1" })).correct, true);
});

test("invalid batch is atomic: no earlier valid event is partially appended", async () => {
  const store = new InMemoryPersistenceAdapter();
  await assert.rejects(store.appendEvents([event("evt-valid"), { eventId: "evt-invalid", type: "ANSWER_SUBMITTED" }]));
  assert.deepEqual(await store.readEvents({ userId: "user-1" }), []);
});

test("duplicate IDs with conflicting contents inside one batch are rejected atomically", async () => {
  const store = new InMemoryPersistenceAdapter();
  await assert.rejects(store.appendEvents([event("evt-1"), event("evt-1", { correct: false })]));
  assert.deepEqual(await store.readEvents({ userId: "user-1" }), []);
});

test("merge is idempotent and event union is independent of merge order", async () => {
  const a = event("evt-a", { occurredAt: "2026-10-27T09:00:00.000Z" });
  const b = event("evt-b", { occurredAt: "2026-10-27T11:00:00.000Z" });
  const left = new InMemoryPersistenceAdapter();
  const right = new InMemoryPersistenceAdapter();
  await left.mergeEvents([a]);
  await left.mergeEvents([b]);
  await right.mergeEvents([b, a]);
  const ids = async (store) => (await store.readEvents({ userId: "user-1" })).map((item) => item.eventId).sort();
  assert.deepEqual(await ids(left), ["evt-a", "evt-b"]);
  assert.deepEqual(await ids(right), ["evt-a", "evt-b"]);
  assert.deepEqual(await left.mergeEvents([a, b]), { appended: 0, duplicates: 2 });
});

test("deleting and rebuilding a snapshot does not change source events", async () => {
  const store = new InMemoryPersistenceAdapter();
  await store.appendEvents([event("evt-1"), event("evt-2", { correct: false })]);
  const projector = (events) => ({ count: events.length, correct: events.filter((item) => item.correct).length });
  const original = await store.rebuildSnapshot("learning-state", projector, { userId: "user-1" });
  assert.deepEqual(original.state, { count: 2, correct: 1 });
  assert.equal(await store.deleteSnapshot("learning-state"), true);
  assert.equal(await store.readSnapshot("learning-state"), null);
  const rebuilt = await store.rebuildSnapshot("learning-state", projector, { userId: "user-1" });
  assert.deepEqual(rebuilt.state, original.state);
  assert.deepEqual((await store.readEvents({ userId: "user-1" })).map((item) => item.eventId), ["evt-1", "evt-2"]);
});

test("integrity verification passes for valid events and reports counts", async () => {
  const store = new InMemoryPersistenceAdapter();
  await store.appendEvents([event("evt-1"), event("evt-2")]);
  assert.deepEqual(await store.verifyIntegrity(), {
    valid: true, eventCount: 2, userFactCount: 0, snapshotCount: 0, contentCacheCount: 0
  });
});

test("invalid timestamp and missing envelope fields are rejected", async () => {
  const store = new InMemoryPersistenceAdapter();
  await assert.rejects(store.appendEvents([event("evt-bad-time", { occurredAt: "not-a-date" })]));
  await assert.rejects(store.appendEvents([event("evt-no-version", { schemaVersion: 0 })]));
  assert.deepEqual(await store.readEvents({ userId: "user-1" }), []);
});

test("clearing Content Cache preserves Learning Events and User Facts", async () => {
  const store = new InMemoryPersistenceAdapter();
  await store.appendEvents([event("evt-preserve")]);
  await store.writeUserFact(userFact("fact-1"));
  await store.writeContentCache("starter-pack", "1.0.0", { approved: true, items: ["item-a"] });
  await store.writeContentCache("starter-pack", "1.1.0", { approved: true, items: ["item-b"] });

  assert.deepEqual(await store.clearContentCache(), { deleted: 2 });
  assert.equal(await store.readContentCache("starter-pack", "1.0.0"), null);
  assert.deepEqual(await store.readEvents({ userId: "user-1" }), [event("evt-preserve")]);
  assert.deepEqual(await store.readUserFacts("user-1"), [userFact("fact-1")]);
});

test("Content Cache rejects packages that are not explicitly approved", async () => {
  const store = new InMemoryPersistenceAdapter();
  await assert.rejects(
    store.writeContentCache("unapproved-pack", "1.0.0", { approved: false }),
    /CONTENT_CACHE_PACKAGE_NOT_APPROVED/
  );
  assert.equal(await store.readContentCache("unapproved-pack", "1.0.0"), null);
});

test("User Facts are scoped by user and never appear in another user's reads", async () => {
  const store = new InMemoryPersistenceAdapter();
  await store.writeUserFact(userFact("fact-shared-id", { userId: "user-a" }));
  await store.writeUserFact(userFact("fact-shared-id", { userId: "user-b", value: "different user fact" }));
  assert.equal((await store.readUserFacts("user-a")).length, 1);
  assert.equal((await store.readUserFacts("user-b")).length, 1);
  assert.equal((await store.readUserFact("user-a", "fact-shared-id")).value.preferredSessionMinutes, 10);
  assert.equal((await store.readUserFact("user-b", "fact-shared-id")).value, "different user fact");
});

test("User Facts can be updated without rewriting immutable Learning Events", async () => {
  const store = new InMemoryPersistenceAdapter();
  await store.appendEvents([event("evt-immutable", { correct: true })]);
  await store.writeUserFact(userFact("fact-1"));
  await store.writeUserFact(userFact("fact-1", {
    value: { preferredSessionMinutes: 15 },
    updatedAt: "2026-10-02T10:00:00.000Z"
  }));
  assert.equal((await store.readUserFact("user-1", "fact-1")).value.preferredSessionMinutes, 15);
  assert.equal((await store.getEventById("evt-immutable", { userId: "user-1" })).correct, true);
  assert.equal((await store.readEvents({ userId: "user-1" })).length, 1);
});

test("User Fact validation rejects missing provenance and invalid confidence", async () => {
  const store = new InMemoryPersistenceAdapter();
  await assert.rejects(store.writeUserFact(userFact("fact-no-source", { source: "" })));
  await assert.rejects(store.writeUserFact(userFact("fact-bad-confidence", { confidence: 1.5 })));
  assert.deepEqual(await store.readUserFacts("user-1"), []);
});


test("readEvents has deterministic timestamp and eventId ordering with stable cursor pagination", async () => {
  const store = new InMemoryPersistenceAdapter();
  await store.appendEvents([
    event("evt-c", { occurredAt: "2026-10-27T11:00:00.000Z" }),
    event("evt-b", { occurredAt: "2026-10-27T10:00:00.000Z" }),
    event("evt-a", { occurredAt: "2026-10-27T10:00:00.000Z" }),
    event("evt-old", { occurredAt: "2026-10-27T08:00:00.000Z" })
  ]);
  const first = await store.readEvents({ userId: "user-1", limit: 2 });
  assert.deepEqual(first.map((item) => item.eventId), ["evt-old", "evt-a"]);
  const second = await store.readEvents({ userId: "user-1", limit: 2, cursor: first.at(-1).eventId });
  assert.deepEqual(second.map((item) => item.eventId), ["evt-b", "evt-c"]);
  assert.deepEqual([...first, ...second].map((item) => item.eventId), ["evt-old", "evt-a", "evt-b", "evt-c"]);
});

test("readEvents filters by scope and time range; upper time bound is exclusive", async () => {
  const store = new InMemoryPersistenceAdapter();
  await store.appendEvents([
    event("evt-a", { userId: "user-a", deviceId: "device-1", occurredAt: "2026-10-27T09:00:00.000Z" }),
    event("evt-b", { userId: "user-a", deviceId: "device-2", occurredAt: "2026-10-27T10:00:00.000Z" }),
    event("evt-c", { userId: "user-b", deviceId: "device-1", occurredAt: "2026-10-27T10:30:00.000Z" })
  ]);
  const results = await store.readEvents({
    userId: "user-a",
    deviceId: "device-1",
    from: "2026-10-27T09:00:00.000Z",
    to: "2026-10-27T10:00:00.000Z"
  });
  assert.deepEqual(results.map((item) => item.eventId), ["evt-a"]);
});

test("readEvents rejects invalid pagination and cursors explicitly", async () => {
  const store = new InMemoryPersistenceAdapter();
  await store.appendEvents([event("evt-1")]);
  await assert.rejects(store.readEvents({ userId: "user-1", limit: 0 }), /INVALID_EVENT_QUERY_LIMIT/);
  await assert.rejects(store.readEvents({ userId: "user-1", cursor: "missing-event" }), /INVALID_EVENT_CURSOR/);
  await assert.rejects(store.readEvents({ userId: "user-1", from: "2026-10-28T00:00:00.000Z", to: "2026-10-27T00:00:00.000Z" }), /INVALID_EVENT_QUERY_RANGE/);
});

test("simulated storage failure is explicit and event batch remains atomic", async () => {
  const store = new InMemoryPersistenceAdapter();
  store.failNextOperation("appendEvents", "STORAGE_QUOTA_EXCEEDED");
  await assert.rejects(store.appendEvents([event("evt-a"), event("evt-b")]), (error) => {
    assert.ok(error instanceof PersistenceFailureError);
    assert.equal(error.code, "STORAGE_QUOTA_EXCEEDED");
    assert.equal(error.operation, "appendEvents");
    return true;
  });
  assert.deepEqual(await store.readEvents({ userId: "user-1" }), []);
  assert.deepEqual(await store.appendEvents([event("evt-a")]), { appended: 1, duplicates: 0 });
});


test("persistence requires user and device scope on every Learning Event", async () => {
  const store = new InMemoryPersistenceAdapter();
  await assert.rejects(store.appendEvents([event("evt-no-user", { userId: "" })]), /REQUIRED_FIELD_MISSING:userId|INVALID_EVENT_FIELD_TYPE/);
  await assert.rejects(store.appendEvents([event("evt-no-device", { deviceId: "" })]), /REQUIRED_FIELD_MISSING:deviceId|INVALID_EVENT_FIELD_TYPE/);
  assert.deepEqual(await store.readEvents({ userId: "user-1" }), []);
});

test("event reads require user scope and never expose another user's records", async () => {
  const store = new InMemoryPersistenceAdapter();
  await store.appendEvents([
    event("evt-user-a", { userId: "user-a", deviceId: "device-a" }),
    event("evt-user-b", { userId: "user-b", deviceId: "device-b" })
  ]);
  await assert.rejects(store.readEvents(), /EVENT_QUERY_USER_ID_REQUIRED/);
  assert.deepEqual((await store.readEvents({ userId: "user-a" })).map((item) => item.eventId), ["evt-user-a"]);
  assert.equal(await store.getEventById("evt-user-b", { userId: "user-a" }), null);
  assert.equal((await store.getEventById("evt-user-b", { userId: "user-b" })).eventId, "evt-user-b");
});

test("event reads can isolate one device while preserving same user's multi-device history", async () => {
  const store = new InMemoryPersistenceAdapter();
  await store.appendEvents([
    event("evt-device-a", { userId: "user-a", deviceId: "device-a" }),
    event("evt-device-b", { userId: "user-a", deviceId: "device-b", occurredAt: "2026-10-27T11:00:00.000Z" })
  ]);
  assert.deepEqual((await store.readEvents({ userId: "user-a" })).map((item) => item.eventId), ["evt-device-a", "evt-device-b"]);
  assert.deepEqual((await store.readEvents({ userId: "user-a", deviceId: "device-a" })).map((item) => item.eventId), ["evt-device-a"]);
  assert.equal(await store.getEventById("evt-device-b", { userId: "user-a", deviceId: "device-a" }), null);
});

test("readEvents reports injected read failure explicitly", async () => {
  const store = new InMemoryPersistenceAdapter();
  await store.appendEvents([event("evt-1")]);
  store.failNextOperation("readEvents", "STORAGE_UNAVAILABLE");
  await assert.rejects(store.readEvents({ userId: "user-1" }), (error) => {
    assert.ok(error instanceof PersistenceFailureError);
    assert.equal(error.code, "STORAGE_UNAVAILABLE");
    assert.equal(error.operation, "readEvents");
    return true;
  });
  assert.deepEqual((await store.readEvents({ userId: "user-1" })).map((item) => item.eventId), ["evt-1"]);
});
