/**
 * Grammar Trail Content Library Validator v1.0.0
 * Pure deterministic validation for a versioned content package.
 * No browser storage, network, UI, or learner-state side effects.
 */

export const CONTENT_SCHEMA_VERSION = 1;
export const CONTENT_LIBRARY_VERSION = "1.0.0";

const COLLECTIONS = Object.freeze([
  "learningUnits",
  "concepts",
  "contentItems",
  "taskDefinitions",
  "taskVersions",
  "relations",
  "provenanceRecords",
  "rightsRecords",
  "qualityReviews"
]);

const RESPONSE_TYPES = new Set(["single_choice", "multiple_choice", "text_entry", "ordering"]);
const CONTENT_TYPES = new Set(["theory", "example", "hint", "recovery"]);
const RELATION_TYPES = new Set([
  "requires", "related_to", "contrasts_with", "part_of", "practices", "explains", "recovers"
]);
const PUBLISHED = "PUBLISHED";
const BLOCKER = "BLOCKER";

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function nonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function versionRef(entity) {
  return entity && nonEmptyString(entity.id) && nonEmptyString(entity.version)
    ? entity.id + "@" + entity.version
    : null;
}

function issue(code, path, message, severity = BLOCKER) {
  return Object.freeze({ code, path, message, severity });
}

function list(value) {
  return Array.isArray(value) ? value : [];
}

/**
 * Validate a package and return machine-readable issues.
 *
 * Package envelope:
 * {
 *   packageId, packageVersion, schemaVersion, minEngineVersion,
 *   entities: { learningUnits, concepts, contentItems, taskDefinitions,
 *     taskVersions, relations, provenanceRecords, rightsRecords, qualityReviews }
 * }
 *
 * Versioned references use "stableId@version". This validator does not mutate
 * the supplied package and does not install or activate it.
 */
export function validateContentPackage(pkg) {
  const errors = [];
  const warnings = [];
  const add = (target, code, path, message, severity = BLOCKER) => {
    target.push(issue(code, path, message, severity));
  };

  if (!isObject(pkg)) {
    add(errors, "PACKAGE_NOT_OBJECT", "$", "Package must be an object.");
    return Object.freeze({
      valid: false,
      publicationEligible: false,
      errors: Object.freeze(errors),
      warnings: Object.freeze(warnings),
      summary: Object.freeze({ checkedEntities: 0, checkedRelations: 0 })
    });
  }

  for (const key of ["packageId", "packageVersion", "minEngineVersion"]) {
    if (!nonEmptyString(pkg[key])) {
      add(errors, "PACKAGE_FIELD_REQUIRED", key, key + " is required.");
    }
  }
  if (pkg.schemaVersion !== CONTENT_SCHEMA_VERSION) {
    add(errors, "SCHEMA_VERSION_UNSUPPORTED", "schemaVersion",
      "schemaVersion must equal supported version " + CONTENT_SCHEMA_VERSION + ".");
  }
  if (!isObject(pkg.entities)) {
    add(errors, "ENTITIES_REQUIRED", "entities", "entities must be an object.");
  }

  const entities = isObject(pkg.entities) ? pkg.entities : {};
  for (const collection of COLLECTIONS) {
    if (!Array.isArray(entities[collection])) {
      add(errors, "COLLECTION_REQUIRED", "entities." + collection,
        collection + " must be an array.");
    }
  }

  const allByRef = new Map();
  const allById = new Map();
  let checkedEntities = 0;
  let checkedRelations = 0;

  for (const collection of COLLECTIONS) {
    const rows = list(entities[collection]);
    const seenIds = new Set();
    const seenRefs = new Set();
    rows.forEach((entity, index) => {
      checkedEntities++;
      const path = "entities." + collection + "[" + index + "]";
      if (!isObject(entity)) {
        add(errors, "ENTITY_NOT_OBJECT", path, "Entity must be an object.");
        return;
      }
      if (!nonEmptyString(entity.id)) {
        add(errors, "ENTITY_ID_REQUIRED", path + ".id", "Entity id is required.");
      } else if (seenIds.has(entity.id) && collection !== "relations" &&
          collection !== "provenanceRecords" && collection !== "rightsRecords" &&
          collection !== "qualityReviews" && collection !== "taskDefinitions") {
        // Versioned entities may share a stable ID only if their version differs.
        // The stable ID/version pair is checked below; repeated stable IDs are allowed.
      } else {
        seenIds.add(entity.id);
      }

      if (collection !== "relations" && collection !== "provenanceRecords" &&
          collection !== "rightsRecords" && collection !== "qualityReviews" &&
          collection !== "taskDefinitions") {
        if (!nonEmptyString(entity.version)) {
          add(errors, "ENTITY_VERSION_REQUIRED", path + ".version", "Entity version is required.");
        } else if (nonEmptyString(entity.id)) {
          const ref = versionRef(entity);
          if (seenRefs.has(ref)) {
            add(errors, "DUPLICATE_ENTITY_VERSION", path, "Duplicate entity reference: " + ref + ".");
          } else {
            seenRefs.add(ref);
            allByRef.set(collection + ":" + ref, entity);
            if (!allById.has(collection + ":" + entity.id)) allById.set(collection + ":" + entity.id, []);
            allById.get(collection + ":" + entity.id).push(entity);
          }
        }
      } else if (nonEmptyString(entity.id)) {
        if (seenIds.has(entity.id) && collection !== "relations") {
          add(errors, "DUPLICATE_ENTITY_ID", path + ".id", "Duplicate id in " + collection + ": " + entity.id + ".");
        }
        seenIds.add(entity.id);
        allById.set(collection + ":" + entity.id, entity);
      }
    });
  }

  const resolveRef = (ref, collection, path) => {
    if (!nonEmptyString(ref) || !ref.includes("@")) {
      add(errors, "VERSIONED_REF_INVALID", path, "Reference must use stableId@version.");
      return null;
    }
    const entity = allByRef.get(collection + ":" + ref);
    if (!entity) add(errors, "REFERENCE_NOT_FOUND", path, "Unresolved reference: " + ref + ".");
    return entity ?? null;
  };
  const resolveId = (id, collection, path) => {
    if (!nonEmptyString(id)) {
      add(errors, "REFERENCE_ID_REQUIRED", path, "Reference ID is required.");
      return null;
    }
    const entity = allById.get(collection + ":" + id);
    if (!entity) add(errors, "REFERENCE_NOT_FOUND", path, "Unresolved " + collection + " ID: " + id + ".");
    return entity ?? null;
  };

  // Concepts and learning units need human-readable objectives/definitions.
  list(entities.concepts).forEach((entity, i) => {
    const path = "entities.concepts[" + i + "]";
    if (!nonEmptyString(entity?.title)) add(errors, "CONCEPT_TITLE_REQUIRED", path + ".title", "Concept title is required.");
    if (!nonEmptyString(entity?.definition)) add(errors, "CONCEPT_DEFINITION_REQUIRED", path + ".definition", "Concept definition is required.");
  });

  list(entities.learningUnits).forEach((entity, i) => {
    const path = "entities.learningUnits[" + i + "]";
    if (!nonEmptyString(entity?.title)) add(errors, "UNIT_TITLE_REQUIRED", path + ".title", "Learning unit title is required.");
    for (const ref of list(entity?.conceptRefs)) resolveRef(ref, "concepts", path + ".conceptRefs");
    for (const ref of list(entity?.contentItemRefs)) resolveRef(ref, "contentItems", path + ".contentItemRefs");
    for (const ref of list(entity?.taskVersionRefs)) resolveRef(ref, "taskVersions", path + ".taskVersionRefs");
    if (!Array.isArray(entity?.conceptRefs) || entity.conceptRefs.length === 0) {
      add(errors, "UNIT_CONCEPTS_REQUIRED", path + ".conceptRefs", "Learning unit must reference at least one concept.");
    }
  });

  const checkComplexity = (complexity, path) => {
    if (!isObject(complexity)) {
      add(errors, "COMPLEXITY_REQUIRED", path, "Complexity dimensions must be explicit.");
      return;
    }
    for (const dimension of ["grammar", "lexical", "context"]) {
      if (!["low", "medium", "high", "unknown", "not_applicable"].includes(complexity[dimension])) {
        add(errors, "COMPLEXITY_VALUE_INVALID", path + "." + dimension,
          "Use low, medium, high, unknown, or not_applicable.");
      }
    }
  };

  const checkRightsAndReview = (entity, path, collection) => {
    const provenance = resolveId(entity?.provenanceId, "provenanceRecords", path + ".provenanceId");
    const rights = resolveId(entity?.rightsId, "rightsRecords", path + ".rightsId");
    const review = resolveId(entity?.qualityReviewId, "qualityReviews", path + ".qualityReviewId");
    if (provenance && (!nonEmptyString(provenance.origin) || !nonEmptyString(provenance.createdBy))) {
      add(errors, "PROVENANCE_INCOMPLETE", path + ".provenanceId", "Provenance requires origin and createdBy.");
    }
    if (rights && (!nonEmptyString(rights.license) || rights.status !== "CLEARED")) {
      add(errors, "RIGHTS_NOT_CLEARED", path + ".rightsId", "Rights must have a license and status CLEARED.");
    }
    const targetRef = versionRef(entity);
    if (review && (review.targetRef !== targetRef || review.rulesVersion !== "1" ||
        review.status !== "PASS" || !Array.isArray(review.blockers) || review.blockers.length > 0)) {
      add(errors, "QUALITY_REVIEW_NOT_VALID", path + ".qualityReviewId",
        "A passing review for the exact version under rulesVersion 1 is required.");
    }
    if (entity?.publicationStatus !== PUBLISHED) {
      add(errors, "CONTENT_NOT_PUBLISHED", path + ".publicationStatus",
        "Only PUBLISHED content is eligible for package activation.");
    }
  };

  list(entities.contentItems).forEach((entity, i) => {
    const path = "entities.contentItems[" + i + "]";
    if (!CONTENT_TYPES.has(entity?.contentType)) add(errors, "CONTENT_TYPE_UNSUPPORTED", path + ".contentType", "Unsupported content type.");
    if (!nonEmptyString(entity?.title) || !nonEmptyString(entity?.body)) add(errors, "CONTENT_BODY_REQUIRED", path, "Content item requires title and body.");
    for (const ref of list(entity?.conceptRefs)) resolveRef(ref, "concepts", path + ".conceptRefs");
    checkComplexity(entity?.complexity, path + ".complexity");
    checkRightsAndReview(entity, path, "contentItems");
  });

  list(entities.taskDefinitions).forEach((entity, i) => {
    const path = "entities.taskDefinitions[" + i + "]";
    if (!Array.isArray(entity?.targetConceptRefs) || entity.targetConceptRefs.length === 0) {
      add(errors, "TASK_TARGET_REQUIRED", path + ".targetConceptRefs", "Task definition must target at least one concept.");
    }
    for (const ref of list(entity?.targetConceptRefs)) resolveRef(ref, "concepts", path + ".targetConceptRefs");
  });

  list(entities.taskVersions).forEach((entity, i) => {
    const path = "entities.taskVersions[" + i + "]";
    if (!nonEmptyString(entity?.prompt)) add(errors, "TASK_PROMPT_REQUIRED", path + ".prompt", "Task prompt is required.");
    if (!RESPONSE_TYPES.has(entity?.responseType)) {
      add(errors, "RESPONSE_TYPE_UNSUPPORTED", path + ".responseType", "Unsupported response type.");
    }
    resolveId(entity?.taskDefinitionId, "taskDefinitions", path + ".taskDefinitionId");
    for (const ref of list(entity?.conceptRefs)) resolveRef(ref, "concepts", path + ".conceptRefs");
    checkComplexity(entity?.complexity, path + ".complexity");
    if (entity?.responseType === "single_choice" || entity?.responseType === "multiple_choice") {
      const options = entity?.answerSpec?.options;
      const correct = entity?.answerSpec?.correctOptionIds;
      if (!Array.isArray(options) || options.length < 2 || !Array.isArray(correct) || correct.length < 1 ||
          correct.some(id => !options.some(option => option?.id === id)) ||
          (entity.responseType === "single_choice" && correct.length !== 1)) {
        add(errors, "CHOICE_ANSWER_SPEC_INVALID", path + ".answerSpec", "Choice tasks require options and valid correctOptionIds.");
      }
    }
    if (entity?.responseType === "text_entry" &&
        (!Array.isArray(entity?.answerSpec?.acceptedAnswers) || entity.answerSpec.acceptedAnswers.length === 0)) {
      add(errors, "TEXT_ANSWER_SPEC_INVALID", path + ".answerSpec", "Text-entry tasks require acceptedAnswers or an explicit evaluator in a future extension.");
    }
    if (entity?.responseType === "ordering" &&
        (!Array.isArray(entity?.answerSpec?.orderedOptionIds) || entity.answerSpec.orderedOptionIds.length < 2)) {
      add(errors, "ORDER_ANSWER_SPEC_INVALID", path + ".answerSpec", "Ordering tasks require at least two orderedOptionIds.");
    }
    checkRightsAndReview(entity, path, "taskVersions");
  });

  const relationRows = list(entities.relations);
  const graph = new Map();
  relationRows.forEach((relation, i) => {
    checkedRelations++;
    const path = "entities.relations[" + i + "]";
    if (!RELATION_TYPES.has(relation?.type)) add(errors, "RELATION_TYPE_UNSUPPORTED", path + ".type", "Unsupported relation type.");
    const from = resolveRef(relation?.fromRef, "concepts", path + ".fromRef");
    const to = resolveRef(relation?.toRef, "concepts", path + ".toRef");
    if (relation?.type === "requires" && from && to) {
      const edges = graph.get(from.id + "@" + from.version) ?? [];
      edges.push(to.id + "@" + to.version);
      graph.set(from.id + "@" + from.version, edges);
    }
  });

  const visiting = new Set();
  const visited = new Set();
  function visit(node) {
    if (visiting.has(node)) return true;
    if (visited.has(node)) return false;
    visiting.add(node);
    for (const next of graph.get(node) ?? []) if (visit(next)) return true;
    visiting.delete(node);
    visited.add(node);
    return false;
  }
  for (const node of graph.keys()) {
    if (visit(node)) {
      add(errors, "PREREQUISITE_CYCLE", "entities.relations",
        "Directed requires relations must not contain a cycle.");
      break;
    }
  }

  const publicationEligible = errors.length === 0;
  return Object.freeze({
    valid: errors.length === 0,
    publicationEligible,
    errors: Object.freeze(errors),
    warnings: Object.freeze(warnings),
    summary: Object.freeze({ checkedEntities, checkedRelations })
  });
}
