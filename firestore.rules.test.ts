/**
 * Adversarial Security Rules Test Suite ("Dirty Dozen" Verification)
 * Validates that all 12 adversarial payloads defined in security_spec.md
 * are rejected with PERMISSION_DENIED by firestore.rules.
 */

export interface DirtyDozenTestCase {
  id: number;
  name: string;
  targetPath: string;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete';
  authContext: {
    uid: string | null;
    emailVerified: boolean;
  };
  payload?: Record<string, unknown>;
  expectedOutcome: 'PERMISSION_DENIED';
}

export const DIRTY_DOZEN_TESTS: DirtyDozenTestCase[] = [
  {
    id: 1,
    name: 'Shadow Field Injection on Order Creation',
    targetPath: '/orders/ord_1001',
    operation: 'create',
    authContext: { uid: 'user_alice', emailVerified: true },
    payload: {
      orderNumber: 'VA-9001',
      userId: 'user_alice',
      isVipOverride: true,
    },
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 2,
    name: 'Identity Spoofing on Order Creation',
    targetPath: '/orders/ord_1002',
    operation: 'create',
    authContext: { uid: 'user_mallory', emailVerified: true },
    payload: {
      orderNumber: 'VA-9002',
      userId: 'user_alice',
    },
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 3,
    name: 'Unverified Email Write Attempt',
    targetPath: '/users/user_alice',
    operation: 'create',
    authContext: { uid: 'user_alice', emailVerified: false },
    payload: {
      uid: 'user_alice',
      displayName: 'Alice',
      photoURL: '',
      membershipTier: 'Standard',
    },
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 4,
    name: 'PII Cross-User Snooping',
    targetPath: '/users/user_alice/private/info',
    operation: 'get',
    authContext: { uid: 'user_mallory', emailVerified: true },
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 5,
    name: 'Blanket List Scraping on Orders',
    targetPath: '/orders',
    operation: 'list',
    authContext: { uid: 'user_mallory', emailVerified: true },
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 6,
    name: 'Orphaned Subcollection Write',
    targetPath: '/orders/non_existent_order/items/item_1',
    operation: 'create',
    authContext: { uid: 'user_alice', emailVerified: true },
    payload: {
      orderId: 'non_existent_order',
      userId: 'user_alice',
      productId: 'prod_1',
    },
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 7,
    name: 'Terminal State Mutation on Delivered Order',
    targetPath: '/orders/ord_delivered',
    operation: 'update',
    authContext: { uid: 'user_alice', emailVerified: true },
    payload: {
      shipmentStatus: 'In Transit',
    },
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 8,
    name: 'Unauthorized Price Tampering During Order Update',
    targetPath: '/orders/ord_1001',
    operation: 'update',
    authContext: { uid: 'user_alice', emailVerified: true },
    payload: {
      totalAmount: 1,
      shipmentStatus: 'In Transit',
    },
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 9,
    name: 'Path ID Poisoning Attack',
    targetPath: '/orders/bad$id!script',
    operation: 'create',
    authContext: { uid: 'user_alice', emailVerified: true },
    payload: {
      orderNumber: 'VA-9009',
      userId: 'user_alice',
    },
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 10,
    name: 'Value Poisoning on Whitelisted Update Key',
    targetPath: '/orders/ord_1001',
    operation: 'update',
    authContext: { uid: 'user_alice', emailVerified: true },
    payload: {
      shipmentStatus: 'INVALID_STAGE_NAME',
    },
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 11,
    name: 'Client Timestamp Forgery',
    targetPath: '/orders/ord_1001',
    operation: 'create',
    authContext: { uid: 'user_alice', emailVerified: true },
    payload: {
      createdAt: '2020-01-01T00:00:00Z',
    },
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 12,
    name: 'Immutable createdAt Tampering on Update',
    targetPath: '/users/user_alice',
    operation: 'update',
    authContext: { uid: 'user_alice', emailVerified: true },
    payload: {
      displayName: 'Alice Updated',
      createdAt: '2026-10-08T00:00:00Z',
    },
    expectedOutcome: 'PERMISSION_DENIED',
  },
];
