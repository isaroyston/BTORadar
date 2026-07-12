import type { BtoProject } from "../policies/policyConfig";

export const BTO_SOURCE_CREDITS = [
  {
    label: "RecordBTO",
    url: "https://recordbto.com/bto",
    note: "community-maintained project records, listed price ranges, and MRT labels",
  },
] as const;

export function getBtoProjectSourceLabel(project: BtoProject) {
  return !project.dataSource || project.dataSource === "recordbto"
    ? "RecordBTO"
    : "Legacy source marker";
}

export function getBtoProjectSourceNote(project: BtoProject) {
  if (project.dataSource && project.dataSource !== "recordbto") {
    return "This record carries a legacy source marker and is not part of the current RecordBTO-only production dataset.";
  }

  const hasListedMrt = Boolean(
    project.nearestMrt || project.nearestMrtDistanceMeters
  );
  const coverage = hasListedMrt
    ? "project details, listed price ranges, and the supplied MRT label"
    : "project details and listed price ranges";

  return `Community data from RecordBTO: ${coverage}. Verify launch details and eligibility with HDB.`;
}
