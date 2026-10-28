/**
 * Grammar Trail Content Store v1.0.0
 * IndexedDB adapter for immutable, validated content packages.
 * Learning Events and legacy dashboard progress are deliberately out of scope.
 */

import { validateContentPackage } from "./content-library.mjs";

export const CONTENT_STORE_VERSION = "1.0.0";
const DATABASE_VERSION = 1;
const PACKAGE_STORE = "contentPackages";
const META_STORE = "metadata";
const ACTIVE_REF_KEY = "activePackageRef";

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}

function sameJson(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

function parseVersion(value) {
  if (typeof value !== "string" || !/^\d+\.\d+\.\d+$/.test(value)) return null;
  return value.split(".").map(Number);
}

function isVersionCompatible(minimum, current) {
  const min = parseVersion(minimum);
  const cur = parseVersion(current);
  if (!min || !cur) return false;
  for (let i = 0; i < 3; i++) {
    if (cur[i] > min[i]) return true;
    if (cur[i] < min[i]) return false;
  }
  return true;
}

function storageError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

function requestResult(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB request failed."));
  });
}

/** Create the concrete IndexedDB adapter. The database is opened lazily. */
export function createIndexedDBContentAdapter({
  indexedDBImpl = globalThis.indexedDB,
  databaseName = "grammar-trail-content-v1"
} = {}) {
  let databasePromise;

  function openDatabase() {
    if (!indexedDBImpl) {
      return Promise.reject(storageError("STORAGE_UNAVAILABLE", "IndexedDB is unavailable in this environment."));
    }
    if (databasePromise) return databasePromise;

    databasePromise = new Promise((resolve, reject) => {
      let request;
      try {
        request = indexedDBImpl.open(databaseName, DATABASE_VERSION);
      } catch (error) {
        reject(storageError("STORAGE_UNAVAILABLE", error?.message ?? "Could not open IndexedDB."));
        return;
      }
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(PACKAGE_STORE)) {
          db.createObjectStore(PACKAGE_STORE, { keyPath: "key" });
        }
        if (!db.objectStoreNames.contains(META_STORE)) {
          db.createObjectStore(META_STORE, { keyPath: "key" });
        }
      };
      request.onsuccess = () => {
        const db = request.result;
        db.onversionchange = () => db.close();
        resolve(db);
      };
      request.onerror = () => {
        databasePromise = null;
        reject(storageError("STORAGE_UNAVAILABLE", request.error?.message ?? "Could not open IndexedDB."));
      };
      request.onblocked = () => {
        databasePromise = null;
        reject(storageError("STORAGE_BLOCKED", "IndexedDB upgrade is blocked by another open connection."));
      };
    });
    return databasePromise;
  }

  async function getPackage(key) {
    const db = await openDatabase();
    const tx = db.transaction([PACKAGE_STORE], "readonly");
    const row = await requestResult(tx.objectStore(PACKAGE_STORE).get(key));
    return row ? cloneJson(row.package) : null;
  }

  async function getActivePackageRef() {
    const db = await openDatabase();
    const tx = db.transaction([META_STORE], "readonly");
    const row = await requestResult(tx.objectStore(META_STORE).get(ACTIVE_REF_KEY));
    return row?.value ?? null;
  }

  async function putPackageAndActivate(key, pkg) {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      let tx;
      let abortCode = "INSTALL_FAILED";
      try {
        tx = db.transaction([PACKAGE_STORE, META_STORE], "readwrite");
      } catch (error) {
        reject(storageError("STORAGE_UNAVAILABLE", error?.message ?? "Could not start write transaction."));
        return;
      }
      const packages = tx.objectStore(PACKAGE_STORE);
      const metadata = tx.objectStore(META_STORE);
      const existingRequest = packages.get(key);

      existingRequest.onsuccess = () => {
        const existing = existingRequest.result;
        if (existing && !sameJson(existing.package, pkg)) {
          abortCode = "VERSION_IMMUTABLE_CONFLICT";
          try { tx.abort(); } catch {}
          return;
        }

        if (!existing) packages.put({ key, package: cloneJson(pkg), installedAt: new Date().toISOString() });
        const verifyRequest = packages.get(key);
        verifyRequest.onsuccess = () => {
          if (!verifyRequest.result || !sameJson(verifyRequest.result.package, pkg)) {
            abortCode = "READBACK_MISMATCH";
            try { tx.abort(); } catch {}
            return;
          }
          metadata.put({ key: ACTIVE_REF_KEY, value: key });
        };
      };

      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(storageError(abortCode, tx.error?.message ?? "Content package transaction failed."));
      tx.onabort = () => reject(storageError(abortCode, tx.error?.message ?? "Content package transaction was aborted."));
    });
  }

  return Object.freeze({ getPackage, getActivePackageRef, putPackageAndActivate });
}

export function createContentStore({
  adapter = createIndexedDBContentAdapter(),
  validatePackage = validateContentPackage,
  engineVersion = "0.1.0"
} = {}) {
  async function installPackage(pkg) {
    const report = validatePackage(pkg);
    if (!report?.publicationEligible) {
      return Object.freeze({
        status: "INVALID_PACKAGE",
        packageRef: null,
        validation: report ?? null
      });
    }
    if (!isVersionCompatible(pkg.minEngineVersion, engineVersion)) {
      return Object.freeze({
        status: "ENGINE_INCOMPATIBLE",
        packageRef: null,
        requiredEngineVersion: pkg.minEngineVersion,
        currentEngineVersion: engineVersion
      });
    }

    const packageRef = pkg.packageId + "@" + pkg.packageVersion;
    try {
      const existing = await adapter.getPackage(packageRef);
      if (existing && !sameJson(existing, pkg)) {
        return Object.freeze({
          status: "VERSION_IMMUTABLE_CONFLICT",
          packageRef,
          validation: null
        });
      }

      await adapter.putPackageAndActivate(packageRef, pkg);
      const activeRef = await adapter.getActivePackageRef();
      const readBack = await adapter.getPackage(packageRef);
      if (activeRef !== packageRef || !readBack || !sameJson(readBack, pkg)) {
        return Object.freeze({ status: "INSTALL_VERIFICATION_FAILED", packageRef, validation: null });
      }

      return Object.freeze({
        status: existing ? "ACTIVATED_EXISTING_VERSION" : "ACTIVATED",
        packageRef,
        validation: report
      });
    } catch (error) {
      return Object.freeze({
        status: error?.code ?? "INSTALL_FAILED",
        packageRef,
        message: error?.message ?? "Content package installation failed."
      });
    }
  }

  async function getPackage(packageId, packageVersion) {
    const packageRef = packageId + "@" + packageVersion;
    try {
      const pkg = await adapter.getPackage(packageRef);
      return pkg
        ? Object.freeze({ status: "FOUND", packageRef, package: pkg })
        : Object.freeze({ status: "NOT_FOUND", packageRef, package: null });
    } catch (error) {
      return Object.freeze({
        status: error?.code ?? "STORAGE_UNAVAILABLE",
        packageRef,
        package: null,
        message: error?.message ?? "Could not read content package."
      });
    }
  }

  async function getActivePackage() {
    try {
      const packageRef = await adapter.getActivePackageRef();
      if (!packageRef) return Object.freeze({ status: "EMPTY", packageRef: null, package: null });
      const pkg = await adapter.getPackage(packageRef);
      if (!pkg) return Object.freeze({ status: "CORRUPT_ACTIVE_POINTER", packageRef, package: null });
      return Object.freeze({ status: "FOUND", packageRef, package: pkg });
    } catch (error) {
      return Object.freeze({
        status: error?.code ?? "STORAGE_UNAVAILABLE",
        packageRef: null,
        package: null,
        message: error?.message ?? "Could not read active content package."
      });
    }
  }

  return Object.freeze({ installPackage, getPackage, getActivePackage });
}
