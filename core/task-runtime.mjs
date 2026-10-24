/**
 * Grammar Trail Task Runtime & Quality Gate v0.1
 * Validates the task selected by the deterministic Decision Engine and supplied
 * by Content Runtime. It does not choose the learning target or next phase.
 */
export const TASK_RUNTIME_VERSION = "0.1.0";
const PHASES = new Set(["NEW", "UNDERSTAND", "RECALL", "USE", "MIX", "RECALL_LATER", "STRENGTHEN"]);
const FORBIDDEN_STATES = new Set(["DRAFT", "GENERATED", "VALIDATING", "REVIEW_REQUIRED", "DEPRECATED", "ARCHIVED"]);

function fail(code, detail) {
  return Object.freeze({ status: "REJECTED", code, detail });
}
function pass(task, notices = []) {
  return Object.freeze({
    status: "READY",
    task,
    contract: Object.freeze({
      taskRuntimeVersion: TASK_RUNTIME_VERSION,
      taskId: task.taskId,
      knowledgeItemId: task.knowledgeItemId,
      hypothesisId: task.hypothesisId,
      phase: task.phase,
      contentVersion: task.contentVersion,
      notices: Object.freeze(notices)
    })
  });
}

/**
 * selectedTask must already have been chosen by Decision Engine and resolved
 * by Content Runtime. This gate only validates whether it is safe and coherent
 * to deliver to the learner.
 */
export function validateTaskForDelivery({ selectedTask, contentPackage, userState, expectedContentVersion, expectedPhase, allowedHypothesisIds = null }) {
  if (!selectedTask || typeof selectedTask !== "object") return fail("TASK_MISSING", "Decision Engine did not supply a task.");
  const task = selectedTask;
  for (const key of ["taskId", "knowledgeItemId", "hypothesisId", "phase", "contentVersion", "approvalState"]) {
    if (typeof task[key] !== "string" || !task[key].trim()) return fail("TASK_FIELD_MISSING", key + " is required.");
  }
  if (!PHASES.has(task.phase)) return fail("PHASE_UNKNOWN", "Task phase is not recognized.");
  if (FORBIDDEN_STATES.has(task.approvalState) || !["APPROVED", "ACTIVE"].includes(task.approvalState)) {
    return fail("CONTENT_NOT_APPROVED", "Only APPROVED or ACTIVE content may reach a learner.");
  }
  if (expectedContentVersion && task.contentVersion !== expectedContentVersion) {
    return fail("CONTENT_VERSION_MISMATCH", "Task content version differs from the requested version.");
  }
  if (expectedPhase && task.phase !== expectedPhase) {
    return fail("PHASE_MISMATCH", "Task phase differs from the current learning phase.");
  }
  if (allowedHypothesisIds && !allowedHypothesisIds.includes(task.hypothesisId)) {
    return fail("HYPOTHESIS_NOT_ALLOWED", "Task hypothesis is outside the allowed target for this step.");
  }
  if (contentPackage) {
    const packageTask = contentPackage.task;
    if (!packageTask || packageTask.taskId !== task.taskId ||
        packageTask.knowledgeItemId !== task.knowledgeItemId ||
        packageTask.hypothesisId !== task.hypothesisId ||
        packageTask.contentVersion !== task.contentVersion) {
      return fail("PACKAGE_TASK_MISMATCH", "Task does not match the validated Content Runtime package.");
    }
    if (contentPackage.trace?.taskId !== task.taskId ||
        contentPackage.trace?.contentVersion !== task.contentVersion) {
      return fail("PACKAGE_TRACE_MISMATCH", "Content trace does not match the delivered task.");
    }
  }
  if (!userState || typeof userState.state !== "string") {
    return fail("USER_STATE_MISSING", "User State must be evaluated before task delivery.");
  }
  if (["UNSAFE", "OVERLOADED", "CLOSING"].includes(userState.state)) {
    return fail("SAFETY_BLOCK", "Current User State blocks new task delivery.");
  }
  const notices = [];
  if (["CAUTION", "FATIGUED", "RECOVERING", "STABILIZING"].includes(userState.state)) {
    notices.push("REDUCE_SECONDARY_LOAD");
  }
  if (task.phase === "MIX" && userState.mixGatePassed !== true) {
    return fail("PREMATURE_MIX_BLOCK", "Mixing requires explicit prerequisite evidence and a passed MIX Gate.");
  }
  if (!task.payload || typeof task.payload.prompt !== "string" || !task.payload.prompt.trim()) {
    return fail("TASK_PAYLOAD_INVALID", "Task must contain a non-empty prompt.");
  }
  return pass(task, notices);
}
