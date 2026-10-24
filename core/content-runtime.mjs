/**
 * Grammar Trail Content Runtime v0.1
 * Deterministic, local-only resolver for already-authored content.
 * It supplies approved/version-compatible content; it never selects what to learn next.
 */
export const CONTENT_RUNTIME_VERSION = "0.1.0";

const APPROVED_FOR_LEARNER = new Set(["APPROVED", "ACTIVE"]);
const NON_LEARNER_STATES = new Set(["DRAFT", "GENERATED", "VALIDATING", "REVIEW_REQUIRED", "DEPRECATED", "ARCHIVED"]);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function deepFreeze(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value)) deepFreeze(child);
  }
  return value;
}

function emit(observer, event) {
  if (typeof observer !== "function") return;
  // Observability must never break learning flow.
  try { observer(deepFreeze(clone({ at: new Date().toISOString(), runtimeVersion: CONTENT_RUNTIME_VERSION, ...event }))); }
  catch { /* observer errors are intentionally isolated */ }
}

function isEligible(item, request) {
  return item &&
    item.knowledgeItemId === request.knowledgeItemId &&
    item.contentVersion === request.contentVersion &&
    item.phase === request.phase &&
    APPROVED_FOR_LEARNER.has(item.approvalState) &&
    item.taskId &&
    item.hypothesisId &&
    item.payload &&
    typeof item.payload.prompt === "string" &&
    item.payload.prompt.trim().length > 0;
}

function validateRequest(request) {
  assert(request && typeof request === "object", "content request is required");
  for (const key of ["knowledgeItemId", "contentVersion", "phase"]) {
    assert(typeof request[key] === "string" && request[key].trim(), key + " is required");
  }
  assert(Array.isArray(request.items), "request.items must be an array");
}

/**
 * Resolve a single validated package for the exact requested phase/version.
 * Prefer a fresh catalog item; optionally fall back to a known-good local cache
 * package for the same request. Invalid cache entries are never returned.
 */
export function resolveContent(request, { cache = [], observer } = {}) {
  validateRequest(request);
  emit(observer, { type: "CONTENT_REQUESTED", knowledgeItemId: request.knowledgeItemId, phase: request.phase, contentVersion: request.contentVersion });

  const eligible = request.items.filter(item => isEligible(item, request))
    .sort((a, b) => a.taskId.localeCompare(b.taskId));
  if (eligible.length) {
    const selected = eligible[0];
    const packageValue = deepFreeze(clone({
      packageVersion: 1,
      runtimeVersion: CONTENT_RUNTIME_VERSION,
      task: selected,
      trace: {
        knowledgeItemId: selected.knowledgeItemId,
        taskId: selected.taskId,
        hypothesisId: selected.hypothesisId,
        phase: selected.phase,
        contentVersion: selected.contentVersion,
        approvalState: selected.approvalState,
        source: "CATALOG"
      }
    }));
    emit(observer, { type: "CONTENT_RESOLVED", source: "CATALOG", taskId: selected.taskId, knowledgeItemId: selected.knowledgeItemId, phase: selected.phase });
    return { status: "READY", package: packageValue, reason: "APPROVED_VERSION_MATCH" };
  }

  const cached = cache.filter(entry =>
    entry && entry.packageVersion === 1 && entry.task &&
    isEligible(entry.task, request) &&
    entry.trace?.contentVersion === request.contentVersion &&
    entry.trace?.taskId === entry.task.taskId
  ).sort((a, b) => a.task.taskId.localeCompare(b.task.taskId));

  if (cached.length) {
    const packageValue = deepFreeze(clone({ ...cached[0], trace: { ...cached[0].trace, source: "LOCAL_CACHE" } }));
    emit(observer, { type: "CONTENT_FALLBACK_USED", source: "LOCAL_CACHE", taskId: packageValue.task.taskId, knowledgeItemId: request.knowledgeItemId, phase: request.phase });
    return { status: "READY", package: packageValue, reason: "OFFLINE_APPROVED_CACHE" };
  }

  const rejectedStates = [...new Set(request.items
    .filter(item => item?.knowledgeItemId === request.knowledgeItemId && item?.phase === request.phase)
    .map(item => item.approvalState)
    .filter(state => NON_LEARNER_STATES.has(state)))];

  const reason = rejectedStates.length ? "NO_LEARNER_APPROVED_CONTENT" : "NO_COMPATIBLE_CONTENT";
  emit(observer, { type: "CONTENT_UNAVAILABLE", reason, knowledgeItemId: request.knowledgeItemId, phase: request.phase, contentVersion: request.contentVersion });
  return { status: "UNAVAILABLE", package: null, reason, rejectedStates };
}

/** Return a stable diagnostic summary without exposing prompt/answer payloads. */
export function summarizeContentRuntimeEvents(events = []) {
  const relevant = events.filter(e => typeof e?.type === "string" && e.type.startsWith("CONTENT_"));
  return deepFreeze({
    requestCount: relevant.filter(e => e.type === "CONTENT_REQUESTED").length,
    resolvedFromCatalog: relevant.filter(e => e.type === "CONTENT_RESOLVED" && e.source === "CATALOG").length,
    localFallbackCount: relevant.filter(e => e.type === "CONTENT_FALLBACK_USED").length,
    unavailableCount: relevant.filter(e => e.type === "CONTENT_UNAVAILABLE").length,
    lastOutcome: [...relevant].reverse().find(e => ["CONTENT_RESOLVED", "CONTENT_FALLBACK_USED", "CONTENT_UNAVAILABLE"].includes(e.type))?.type ?? null
  });
}
