import test from "node:test";
import assert from "node:assert/strict";
import { InMemoryPersistenceAdapter, PersistenceConflictError } from "./persistence-adapter.mjs";

const event = (eventId, overrides = {}) => ({
  eventId,
  type: "ANSWER_SUBMITTED",
  occurredAt: "2026-10-27T10:00:00.000Z",
  schemaVersion: 1,
  coreVersion: "0.1.0",
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
  assert.deepEqual(await store.getEventById("evt-1"), event("evt-1", { response: { selectedIndex: 1, note: "exact payload" } }));
  assert.deepEqual(await store.readEvents(), [event("evt-1", { response: { selectedIndex: 1, note: "exact payload" } })]);
});

test("same ID and same canonical event is an idempotent duplicate", async () => {
  const store = new InMemoryPersistenceAdapter();
  const first = event("evt-1");
  assert.deepEqual(await store.appendEvents([first]), { appended: 1, duplicates: 0 });
  assert.deepEqual(await store.appendEvents([{ ...first, response: { selectedIndex: 1 } }]), { appended: 0, duplicates: 1 });
  assert.equal((await store.readEvents()).length, 1);
});

test("same ID with different content is an explicit conflict and never overwrites", async () => {
  const store = new InMemoryPersistenceAdapter();
  await store.appendEvents([event("evt-1")]);
  await assert.rejects(store.appendEvents([event("evt-1", { correct: false })]), (error) => {
    assert.ok(error instanceof PersistenceConflictError);
    assert.equal(error.code, "EVENT_ID_CONTENT_CONFLICT");
    return true;
  });
  assert.equal((await store.getEventById("evt-1")).correct, true);
});

test("invalid batch is atomic: no earlier valid event is partially appended", async () => {
  const store = new InMemoryPersistenceAdapter();
  await assert.rejects(store.appendEvents([event("evt-valid"), { eventId: "evt-invalid", type: "ANSWER_SUBMITTED" }]));
  assert.deepEqual(await store.readEvents(), []);
});

test("duplicate IDs with conflicting contents inside one batch are rejected atomically", async () => {
  const store = new InMemoryPersistenceAdapter();
  await assert.rejects(store.appendEvents([event("evt-1"), event("evt-1", { correct: false })]));
  assert.deepEqual(await store.readEvents(), []);
});

test("merge is idempotent and event union is independent of merge order", async () => {
  const a = event("evt-a", { occurredAt: "2026-10-27T09:00:00.000Z" });
  const b = event("evt-b", { occurredAt: "2026-10-27T11:00:00.000Z" });
  const left = new InMemoryPersistenceAdapter();
  const right = new InMemoryPersistenceAdapter();
  await left.mergeEvents([a]);
  await left.mergeEvents([b]);
  await right.mergeEvents([b, a]);
  const ids = async (store) => (await store.readEvents()).map((item) => item.eventId).sort();
  assert.deepEqual(await ids(left), ["evt-a", "evt-b"]);
  assert.deepEqual(await ids(right), ["evt-a", "evt-b"]);
  assert.deepEqual(await left.mergeEvents([a, b]), { appended: 0, duplicates: 2 });
});

test("deleting and rebuilding a snapshot does not change source events", async () => {
  const store = new InMemoryPersistenceAdapter();
  await store.appendEvents([event("evt-1"), event("evt-2", { correct: false })]);
  const projector = (events) => ({ count: events.length, correct: events.filter((item) => item.correct).length });
  const original = await store.rebuildSnapshot("learning-state", projector);
  assert.deepEqual(original.state, { count: 2, correct: 1 });
  assert.equal(await store.deleteSnapshot("learning-state"), true);
  assert.equal(await store.readSnapshot("learning-state"), null);
  const rebuilt = await store.rebuildSnapshot("learning-state", projector);
  assert.deepEqual(rebuilt.state, original.state);
  assert.deepEqual((await store.readEvents()).map((item) => item.eventId), ["evt-1", "evt-2"]);
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
  assert.deepEqual(await store.readEvents(), []);
});

test("clearing Content Cache preserves Learning Events and User Facts", async () => {
  const store = new InMemoryPersistenceAdapter();
  await store.appendEvents([event("evt-preserve")]);
  await store.writeUserFact(userFact("fact-1"));
  await store.writeContentCache("starter-pack", "1.0.0", { approved: true, items: ["item-a"] });
  await store.writeContentCache("starter-pack", "1.1.0", { approved: true, items: ["item-b"] });

  assert.deepEqual(await store.clearContentCache(), { deleted: 2 });
  assert.equal(await store.readContentCache("starter-pack", "1.0.0"), null);
  assert.deepEqual(await store.readEvents(), [event("evt-preserve")]);
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
  assert.equal((await store.getEventById("evt-immutable")).correct, true);
  assert.equal((await store.readEvents()).length, 1);
});

test("User Fact validation rejects missing provenance and invalid confidence", async () => {
  const store = new InMemoryPersistenceAdapter();
  await assert.rejects(store.writeUserFact(userFact("fact-no-source", { source: "" })));
  await assert.rejects(store.writeUserFact(userFact("fact-bad-confidence", { confidence: 1.5 })));
  assert.deepEqual(await store.readUserFacts("user-1"), []);
});
