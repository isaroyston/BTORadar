import assert from "node:assert/strict";

const { allocatePaymentStages, constrainPaymentFunding } = await import(
  "../../frontend/src/utils/paymentAllocation.ts"
);

const unknown = allocatePaymentStages({
  stages: [{ total: 50000, minimumCash: 5000 }],
  availableCash: null,
  availableCpfOa: null,
  grantAmount: null,
});
assert.deepEqual(unknown[0], {
  total: 50000,
  cash: 0,
  cpfOa: 0,
  grant: 0,
  unallocated: 50000,
  minimumCash: 5000,
  minimumCashShortfall: 5000,
});

const allocated = allocatePaymentStages({
  stages: [
    { total: 5000, minimumCash: 5000, cashOnly: true },
    { total: 50000, minimumCash: 5000 },
    { total: 75000, minimumCash: 0 },
  ],
  availableCash: 25000,
  availableCpfOa: 40000,
  grantAmount: 50000,
});
assert.deepEqual(allocated, [
  {
    total: 5000,
    cash: 5000,
    cpfOa: 0,
    grant: 0,
    unallocated: 0,
    minimumCash: 5000,
    minimumCashShortfall: 0,
  },
  {
    total: 50000,
    cash: 5000,
    cpfOa: 0,
    grant: 45000,
    unallocated: 0,
    minimumCash: 5000,
    minimumCashShortfall: 0,
  },
  {
    total: 75000,
    cash: 15000,
    cpfOa: 40000,
    grant: 5000,
    unallocated: 15000,
    minimumCash: 0,
    minimumCashShortfall: 0,
  },
]);

const insufficientMandatoryCash = allocatePaymentStages({
  stages: [{ total: 10000, minimumCash: 10000 }],
  availableCash: 1000,
  availableCpfOa: 50000,
  grantAmount: 0,
});
assert.equal(insufficientMandatoryCash[0].cash, 1000);
assert.equal(insufficientMandatoryCash[0].minimumCash, 10000);
assert.equal(insufficientMandatoryCash[0].minimumCashShortfall, 9000);
assert.equal(insufficientMandatoryCash[0].unallocated, 9000);

const deferredGrant = allocatePaymentStages({
  stages: [
    { total: 2500, minimumCash: 0, allowsGrant: false },
    { total: 22500, minimumCash: 0 },
  ],
  availableCash: 0,
  availableCpfOa: 0,
  grantAmount: 25000,
});
assert.equal(deferredGrant[0].grant, 0);
assert.equal(deferredGrant[0].unallocated, 2500);
assert.equal(deferredGrant[1].grant, 22500);

assert.deepEqual(
  constrainPaymentFunding({
    total: 50000,
    requestedCash: 0,
    minimumCash: 0,
    otherCash: 0,
    otherCpf: 50000,
    availableCash: 100000,
    availableCpf: 50000,
  }),
  { cash: 50000, cpf: 0 }
);
assert.equal(
  constrainPaymentFunding({
    total: 50000,
    requestedCash: 0,
    minimumCash: 5000,
    otherCash: 50000,
    otherCpf: 50000,
    availableCash: 50000,
    availableCpf: 50000,
  }),
  null
);

console.log("Payment allocation checks passed.");
