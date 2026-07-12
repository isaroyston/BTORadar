import assert from "node:assert/strict";
import "./register-typescript-imports.mjs";

const {
  getAvailableBtoScoreComponents,
  scoreBtoProject,
  scoreBtoProjects,
} = await import("../../frontend/src/utils/btoScoring.ts");

const cheap = makeProject("cheap", 300000, {
  nearestMrtDistanceMeters: 400,
  centralityScore: 80,
  expectedTop: "2030-01",
  totalUnits: 900,
});
const middle = makeProject("middle", 600000, {
  nearestMrtDistanceMeters: 800,
  centralityScore: 60,
  expectedTop: "2031-01",
  totalUnits: 600,
});
const expensive = makeProject("expensive", 900000, {
  nearestMrtDistanceMeters: 1400,
  centralityScore: 40,
  expectedTop: "2032-01",
  totalUnits: 300,
});
const fullLaunch = [cheap, middle, expensive];

const affordabilityOnly = weights({ affordability: 100 });
const filteredAgainstItself = scoreBtoProjects(
  [middle],
  { flatType: "4-room", totalAffordability: 1000000 },
  "buyer-fit",
  "custom",
  affordabilityOnly
).get(middle.id);
const filteredAgainstFullLaunch = scoreBtoProjects(
  [middle],
  { flatType: "4-room", totalAffordability: 1000000 },
  "buyer-fit",
  "custom",
  affordabilityOnly,
  fullLaunch
).get(middle.id);

assert.equal(filteredAgainstItself?.total, 94);
assert.equal(filteredAgainstFullLaunch?.total, 90);
assert.ok(
  (filteredAgainstFullLaunch?.total ?? 0) < (filteredAgainstItself?.total ?? 0),
  "A town-filtered result must retain full-launch price normalization."
);

const noAffordability = scoreBtoProject(
  middle,
  {
    flatType: "4-room",
    totalAffordability: null,
    cohortProjects: fullLaunch,
  },
  "buyer-fit",
  "balanced"
);

assert.equal(
  noAffordability.components.some(({ key }) => key === "affordability"),
  false
);
assert.ok(noAffordability.missingFields.includes("affordability estimate"));
assert.equal(noAffordability.coverage, 70);
assert.equal(noAffordability.confidence, "Partial data");

const zeroWeightMissingDimensions = scoreBtoProject(
  makeProject("focused", 500000, {
    nearestMrtDistanceMeters: 500,
    expectedTop: "2030-06",
    totalUnits: 500,
  }),
  {
    flatType: "4-room",
    totalAffordability: null,
    cohortProjects: fullLaunch,
  },
  "buyer-fit",
  "custom",
  weights({ commute: 40, wait: 30, supply: 30 })
);

assert.equal(zeroWeightMissingDimensions.coverage, 100);
assert.equal(zeroWeightMissingDimensions.confidence, "Strong data");
assert.deepEqual(zeroWeightMissingDimensions.missingFields, []);
assert.deepEqual(
  zeroWeightMissingDimensions.components.map(({ key }) => key),
  ["commute", "wait", "supply"]
);

const partialProject = makeProject("partial", 500000, {
  nearestMrtDistanceMeters: 700,
  totalUnits: 450,
});
const weightedPartial = scoreBtoProject(
  partialProject,
  {
    flatType: "4-room",
    totalAffordability: null,
    cohortProjects: fullLaunch,
  },
  "buyer-fit",
  "custom",
  weights({
    affordability: 50,
    commute: 20,
    centrality: 10,
    wait: 10,
    supply: 10,
  })
);

assert.equal(weightedPartial.coverage, 30);
assert.equal(weightedPartial.confidence, "Limited data");
assert.deepEqual(
  weightedPartial.components.map(({ key, weight }) => [key, weight]),
  [
    ["commute", 20],
    ["supply", 10],
  ]
);

assert.deepEqual(
  [...getAvailableBtoScoreComponents(fullLaunch, "4-room", 1000000)].sort(),
  ["affordability", "centrality", "commute", "supply", "wait"]
);
assert.equal(
  getAvailableBtoScoreComponents(fullLaunch, "4-room", null).has(
    "affordability"
  ),
  false
);

console.log("BTO scoring checks passed.");

function makeProject(
  id,
  price,
  {
    nearestMrtDistanceMeters,
    centralityScore,
    expectedTop,
    totalUnits,
  } = {}
) {
  return {
    id,
    launchMonth: "2026-10",
    name: id,
    location: id,
    district: id,
    flatVariants: [
      {
        type: "4-room",
        basePrice: price,
        floorAreaSqm: 100,
        maxEhg: 120000,
      },
    ],
    nearestMrtDistanceMeters,
    locationSignals:
      centralityScore === undefined
        ? undefined
        : { centralityScore, centralityLabel: `${centralityScore}` },
    expectedTop,
    totalUnits,
  };
}

function weights(overrides) {
  return {
    affordability: 0,
    commute: 0,
    centrality: 0,
    wait: 0,
    supply: 0,
    ...overrides,
  };
}
