/**
 * Grammar Trail Universal Content Package Adapter v0.1
 * Reusable Markdown ingestion. Package-specific variation lives in a profile.
 * Authored text is preserved; semantic grading rules are never inferred.
 */
export const UNIVERSAL_CONTENT_ADAPTER_VERSION = "0.1.0";
const DEFAULT_SECTION_ALIASES = Object.freeze({
  learnerPrompt: ["learner prompt", "prompt", "task"],
  expectedAnswer: ["expected answer", "answer key", "expected answers"],
  acceptedAlternatives: ["accepted alternatives", "accepted answers", "alternatives"],
  errorPatterns: ["error patterns", "diagnostic patterns"],
  feedback: ["feedback", "answer feedback"],
  recoveryMapping: ["recovery mapping", "recovery"],
  skillTags: ["skill tags", "skills"],
  editorialNote: ["editorial note", "editorial notes"]
});
function isObject(v) { return v !== null && typeof v === "object" && !Array.isArray(v); }
function freezeDeep(v) {
  if (v && typeof v === "object" && !Object.isFrozen(v)) {
    Object.freeze(v);
    for (const child of Object.values(v)) freezeDeep(child);
  }
  return v;
}
function normalizeHeading(v) { return v.toLocaleLowerCase("en").replace(/\s+/g, " ").trim(); }
function parseSectionBlocks(body) {
  const sections = {};
  let current = null;
  let buffer = [];
  const flush = () => {
    if (current !== null) {
      if (Object.hasOwn(sections, current)) throw new Error("DUPLICATE_SECTION_HEADING:" + current);
      sections[current] = buffer.join("\n").trim();
    }
  };
  for (const line of body.split(/\r?\n/)) {
    const match = line.match(/^\*\*(.+?)\*\*\s*$/);
    if (match) { flush(); current = match[1].trim(); buffer = []; }
    else if (current !== null) buffer.push(line);
  }
  flush();
  return sections;
}
export function parseMarkdownExerciseDocument({ documentPath, markdown }) {
  if (typeof documentPath !== "string" || !documentPath.trim())
    return { status: "REJECTED", issues: [{ code: "DOCUMENT_PATH_REQUIRED" }], exercises: [] };
  if (typeof markdown !== "string" || !markdown.trim())
    return { status: "REJECTED", issues: [{ code: "MARKDOWN_REQUIRED" }], exercises: [] };
  const pattern = /^##\s+([A-Za-z0-9][A-Za-z0-9_-]*)\s+—\s+(.+)\s*$/gm;
  const matches = [...markdown.matchAll(pattern)];
  if (!matches.length)
    return { status: "REJECTED", issues: [{ code: "EXERCISE_HEADINGS_NOT_FOUND", documentPath }], exercises: [] };
  const exercises = [], issues = [];
  for (let i = 0; i < matches.length; i++) {
    const m = matches[i], start = m.index + m[0].length;
    const end = i + 1 < matches.length ? matches[i + 1].index : markdown.length;
    const body = markdown.slice(start, end).trim();
    let sections;
    try { sections = parseSectionBlocks(body); }
    catch (error) { issues.push({ code: "DUPLICATE_SECTION_HEADING", exerciseId: m[1], detail: String(error.message) }); continue; }
    exercises.push({
      exerciseId: m[1], title: m[2].trim(),
      source: { documentPath, heading: m[0].trim() },
      sourceBody: body, sections
    });
  }
  const seen = new Set();
  for (const item of exercises) {
    if (seen.has(item.exerciseId)) issues.push({ code: "DUPLICATE_EXERCISE_ID", exerciseId: item.exerciseId });
    seen.add(item.exerciseId);
  }
  return freezeDeep({
    status: issues.length ? "REJECTED" : "PARSED",
    adapterVersion: UNIVERSAL_CONTENT_ADAPTER_VERSION,
    documentPath, exerciseCount: exercises.length, exercises, issues
  });
}
export function ingestMarkdownContentPackage({ manifest, documents, profile }) {
  const issues = [];
  if (!isObject(manifest)) issues.push({ code: "MANIFEST_REQUIRED" });
  if (!Array.isArray(documents) || !documents.length) issues.push({ code: "DOCUMENTS_REQUIRED" });
  if (!isObject(profile)) issues.push({ code: "PACKAGE_PROFILE_REQUIRED" });
  if (issues.length) return freezeDeep({ status: "REJECTED", adapterVersion: UNIVERSAL_CONTENT_ADAPTER_VERSION, issues });

  const actualDocuments = documents.map(x => x && x.documentPath).filter(Boolean);
  for (const path of profile.requiredDocuments ?? []) {
    if (!actualDocuments.includes(path)) issues.push({ code: "SOURCE_DOCUMENT_MISSING", documentPath: path });
  }
  const parsed = [];
  for (const doc of documents) {
    const result = parseMarkdownExerciseDocument(doc);
    if (result.status !== "PARSED") issues.push(...result.issues);
    else parsed.push(...result.exercises);
  }
  const byId = new Map();
  for (const item of parsed) {
    if (byId.has(item.exerciseId)) issues.push({ code: "DUPLICATE_EXERCISE_ID", exerciseId: item.exerciseId });
    else byId.set(item.exerciseId, item);
  }
  const expectedIds = profile.expectedExerciseIds ?? [];
  for (const id of expectedIds) if (!byId.has(id)) issues.push({ code: "EXERCISE_MISSING", exerciseId: id });
  const expectedSet = new Set(expectedIds);
  if (expectedSet.size && !profile.allowAdditionalExercises) {
    for (const id of byId.keys()) if (!expectedSet.has(id)) issues.push({ code: "UNEXPECTED_EXERCISE", exerciseId: id });
  }
  if (expectedIds.length && parsed.length !== expectedIds.length)
    issues.push({ code: "EXERCISE_COUNT_MISMATCH", expected: expectedIds.length, actual: parsed.length });

  const aliases = { ...DEFAULT_SECTION_ALIASES, ...(profile.sectionAliases ?? {}) };
  const requiredSections = profile.requiredSections ?? [
    "learnerPrompt", "expectedAnswer", "acceptedAlternatives", "errorPatterns",
    "feedback", "recoveryMapping", "skillTags"
  ];
  const normalized = parsed.map(item => {
    const authored = {};
    for (const [field, labels] of Object.entries(aliases)) {
      const candidates = (Array.isArray(labels) ? labels : [labels]).map(normalizeHeading);
      const found = Object.entries(item.sections).find(([heading]) => candidates.includes(normalizeHeading(heading)));
      if (found) authored[field] = found[1];
    }
    for (const field of requiredSections) {
      if (typeof authored[field] !== "string" || !authored[field].trim())
        issues.push({ code: "REQUIRED_SECTION_MISSING", exerciseId: item.exerciseId, section: field });
    }
    const special = profile.specialStructures?.[item.exerciseId];
    for (const heading of special?.requiredHeadings ?? []) {
      if (!Object.hasOwn(item.sections, heading))
        issues.push({ code: "SPECIAL_HEADING_MISSING", exerciseId: item.exerciseId, heading });
    }
    if (special?.sectionCount !== undefined && Object.keys(item.sections).length !== special.sectionCount)
      issues.push({ code: "SPECIAL_SECTION_COUNT_MISMATCH", exerciseId: item.exerciseId, expected: special.sectionCount, actual: Object.keys(item.sections).length });
    return {
      ...item,
      setId: typeof profile.resolveSetId === "function" ? profile.resolveSetId(item.exerciseId, item.source.documentPath) : null,
      authored, evaluation: null, diagnostics: null,
      mappingStatus: "SOURCE_PARSED_REQUIRES_SEMANTIC_MAPPING"
    };
  });
  if (issues.length) return freezeDeep({
    status: "REJECTED", adapterVersion: UNIVERSAL_CONTENT_ADAPTER_VERSION,
    packageId: manifest.packageId ?? null, contentVersion: manifest.contentVersion ?? null,
    issues, parsedExerciseCount: parsed.length
  });
  return freezeDeep({
    status: "INGESTED_DRAFT", adapterVersion: UNIVERSAL_CONTENT_ADAPTER_VERSION,
    package: {
      packageId: manifest.packageId ?? null,
      contentVersion: manifest.contentVersion ?? null,
      packageStatus: manifest.packageStatus ?? "DRAFT",
      language: manifest.language ?? null, level: manifest.level ?? null, domain: manifest.domain ?? null,
      sourceDocuments: actualDocuments, exerciseCount: normalized.length, exercises: normalized
    },
    notices: [
      "Original authored section text is preserved.",
      "Evaluation and diagnostic rules are not inferred from prose.",
      "Draft content is not learner-deliverable."
    ]
  });
}
export function attachRuntimeMapping({ ingestedPackage, exerciseId, mapping }) {
  if (ingestedPackage?.status !== "INGESTED_DRAFT")
    return freezeDeep({ status: "REJECTED", code: "PACKAGE_NOT_INGESTED" });
  if (!ingestedPackage.package.exercises.some(x => x.exerciseId === exerciseId))
    return freezeDeep({ status: "REJECTED", code: "EXERCISE_NOT_FOUND" });
  if (!isObject(mapping) || !isObject(mapping.evaluation) ||
      typeof mapping.hypothesisId !== "string" || !mapping.hypothesisId.trim())
    return freezeDeep({ status: "REVIEW_REQUIRED", code: "EXPLICIT_RUNTIME_MAPPING_REQUIRED" });
  return freezeDeep({
    status: "MAPPED_DRAFT", exerciseId,
    mapping: {
      hypothesisId: mapping.hypothesisId, evaluation: mapping.evaluation,
      diagnostics: mapping.diagnostics ?? [], phaseMappings: mapping.phaseMappings ?? [],
      feedbackPolicy: mapping.feedbackPolicy ?? null, recoveryPolicy: mapping.recoveryPolicy ?? null,
      mappingVersion: mapping.mappingVersion ?? "0.1.0"
    }
  });
}
