import assert from "node:assert/strict";
import "./register-typescript-imports.mjs";

const { eligibilityChecks, latestLaunch, journeyStages, splitCeiling, INCOME_CEILINGS } = await import(
  "../../frontend/src/utils/journey.ts"
);

const byKey = (checks) => Object.fromEntries(checks.map((check) => [check.key, check]));

// Within every ceiling: all clear, with the grant and first-timer priority.
let checks = byKey(eligibilityChecks({ income: 6500, firstTimers: "both", flatType: "4-room", grant: 40000 }));
assert.equal(checks.ceiling.status, "ok");
assert.equal(checks.loan.status, "ok");
assert.equal(checks.grant.status, "ok");
assert.match(checks.grant.title, /40,000/);
assert.equal(checks.priority.status, "ok");

// A 2-room Flexi has the lower ceiling.
checks = byKey(eligibilityChecks({ income: 8500, firstTimers: "both", flatType: "2-room", grant: 15000 }));
assert.equal(checks.ceiling.status, "caution");
assert.equal(checks.loan.status, "ok");

// Above S$16,000 (from 24 Aug 2026): no new flat and no HDB loan; above S$9,000: no grant.
checks = byKey(eligibilityChecks({ income: 14500, firstTimers: "both", flatType: "4-room", grant: 0 }));
assert.equal(checks.ceiling.status, "ok");
checks = byKey(eligibilityChecks({ income: 16500, firstTimers: "both", flatType: "4-room", grant: 0 }));
assert.equal(checks.ceiling.status, "caution");
assert.equal(checks.loan.status, "caution");
assert.equal(checks.grant.status, "info");
assert.equal(INCOME_CEILINGS.newFlat, 16000);
assert.equal(INCOME_CEILINGS.singles, 8000);

// Second-timers: no grant line about income, and no ballot priority.
checks = byKey(eligibilityChecks({ income: 6000, firstTimers: "none", flatType: "4-room", grant: 0 }));
assert.match(checks.grant.title, /No Enhanced CPF Housing Grant/);
assert.equal(checks.priority, undefined);

// The newest launch, what fits, and when the next one is expected.
const project = (id, launchMonth, price, units = 1000) => ({
  id,
  name: id,
  launchMonth,
  location: "Town",
  totalUnits: units,
  flatVariants: [{ type: "4-room", basePrice: price }],
});
const projects = [
  project("old", "Jun 2026", 300000),
  project("a", "Nov 2026", 400000),
  project("b", "Nov 2026", 550000),
  project("c", "Nov 2026", 650000),
];
const launch = latestLaunch({
  projects,
  flatType: "4-room",
  today: new Date(2026, 10, 17),
  ceilingFor: () => 560000,
});
assert.equal(launch.label, "Nov 2026");
assert.equal(launch.openNow, true);
assert.equal(launch.projects.length, 3);
assert.equal(launch.totalUnits, 3000);
assert.equal(launch.priced, 3);
assert.deepEqual(launch.fitting.map((item) => item.id), ["a", "b"]);
assert.equal(launch.lowestPrice, 400000);
assert.equal(launch.nextExpected, "Feb to Mar 2027");
assert.equal(latestLaunch({ projects, flatType: "4-room", today: new Date(2026, 11, 1), ceilingFor: null }).openNow, false);

// Journey stages take dates and money from the payment timeline; keys include post-keys fees.
const timeline = [
  { label: "Application window", date: "Nov 2026", note: "", payment: { label: "", total: 10, cpfOa: 0, cash: 10 } },
  { label: "Flat booking", date: "Feb 2027", note: "", payment: { label: "", total: 2000, cpfOa: 0, cash: 2000 } },
  { label: "Agreement for lease", date: "Jun 2027", note: "", payment: { label: "", total: 40000, cpfOa: 0, cash: 0, grant: 40000 } },
  { label: "Key collection", date: "Jun 2030", note: "", payment: { label: "", total: 60000, cpfOa: 59000, cash: 0, grant: 1000 } },
  { label: "Post-keys fees", date: "Jun 2030", note: "", payment: { label: "", total: 300, cpfOa: 0, cash: 300 } },
];
const stages = journeyStages(timeline);
assert.deepEqual(stages.map((stage) => stage.key), ["hfe", "apply", "book", "sign", "keys"]);
assert.equal(stages[0].due, undefined);
assert.equal(stages[3].due.grant, 40000);
assert.deepEqual(stages[4].due, { total: 60300, cash: 300, cpf: 59000, grant: 1000, shortfall: 0 });

// The ceiling splits into loan, grant, CPF by keys, then cash.
const split = splitCeiling({
  price: 571247,
  limitedBy: "loan",
  oaAtSigning: 70000,
  oaAtKeys: 200000,
  estimate: { loanForTarget: 411209, usableGrantAmount: 40000, estimatedMonthlyPayment: 1866, effectiveTenureYears: 25 },
});
assert.equal(split.price, 571000);
assert.equal(split.loan + split.grant + split.cpf + split.cash, 571247);
assert.equal(split.cpf, 120038);
assert.equal(split.cash, 0);
assert.equal(splitCeiling(null), null);

console.log("journey checks passed");
