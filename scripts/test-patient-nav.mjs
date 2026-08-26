/**
 * Regression tests for patient dossier navigation mapping.
 * Run: node scripts/test-patient-nav.mjs
 *
 * Mirrors src/lib/patient-nav.ts — keep in sync when changing the helper.
 */
import assert from "node:assert/strict";

function patientDossierPath(patientId) {
  if (patientId == null) return null;
  const id = String(patientId).trim();
  if (!id || id === "null" || id === "undefined") return null;
  return `/patient/${encodeURIComponent(id)}`;
}

function patientDossierLink(patientId) {
  const path = patientDossierPath(patientId);
  if (!path) return null;
  const patientIdParam = path.slice("/patient/".length);
  return {
    to: "/patient/$patientId",
    params: { patientId: decodeURIComponent(patientIdParam) },
  };
}

assert.equal(patientDossierPath(null), null);
assert.equal(patientDossierPath(undefined), null);
assert.equal(patientDossierPath(""), null);
assert.equal(patientDossierPath("  "), null);
assert.equal(patientDossierPath("null"), null);

assert.equal(patientDossierPath(42), "/patient/42");
assert.equal(patientDossierPath("7"), "/patient/7");
assert.equal(patientDossierPath(" 9 "), "/patient/9");

assert.deepEqual(patientDossierLink("12"), {
  to: "/patient/$patientId",
  params: { patientId: "12" },
});

// Must never build a /dossiers/:examenId dossier detail URL
assert.equal(patientDossierPath("99")?.startsWith("/patient/"), true);
assert.ok(!patientDossierPath("99")?.includes("/dossiers/"));

// Operational list → dossier contract
const waitingRoomRow = { id: "examen-1", patientId: "3", patient: "Demo" };
const impayeRow = { id: "examen-2", patientId: "5", reste: 100 };
assert.equal(patientDossierPath(waitingRoomRow.patientId), "/patient/3");
assert.equal(patientDossierPath(impayeRow.patientId), "/patient/5");
assert.notEqual(patientDossierPath(waitingRoomRow.id), "/patient/3");

console.log("patient-nav tests: OK");
