const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const TRANSITIONS = {
  pending: new Set(['confirmed', 'cancelled']),
  confirmed: new Set(['shipped', 'cancelled']),
  shipped: new Set(['delivered', 'cancelled']),
  delivered: new Set(),
  cancelled: new Set(),
};

function canTransition(from, to) {
  return TRANSITIONS[from] && TRANSITIONS[from].has(to);
}

describe('order status transitions', () => {
  it('allows pending -> confirmed and pending -> cancelled', () => {
    assert.equal(canTransition('pending', 'confirmed'), true);
    assert.equal(canTransition('pending', 'cancelled'), true);
  });

  it('rejects delivered -> pending and cancelled -> anything', () => {
    assert.equal(canTransition('delivered', 'pending'), false);
    assert.equal(canTransition('cancelled', 'pending'), false);
    assert.equal(canTransition('cancelled', 'delivered'), false);
  });

  it('allows the happy path pending → confirmed → shipped → delivered', () => {
    assert.equal(canTransition('pending', 'confirmed'), true);
    assert.equal(canTransition('confirmed', 'shipped'), true);
    assert.equal(canTransition('shipped', 'delivered'), true);
  });
});
