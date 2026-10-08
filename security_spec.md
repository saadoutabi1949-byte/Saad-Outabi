# Security Specification (`security_spec.md`)

## 1. Data Invariants & Master Source of Truth

1. **Global Default-Deny Safety Net**: Every unmatched path is strictly rejected (`allow read, write: if false;`).
2. **Verified Identity Mandate**: Every write operation across all collections requires `request.auth != null && request.auth.token.email_verified == true`.
3. **PII Split-Collection Isolation (Pillar 6)**:
   - `/users/{userId}` holds only non-sensitive profile data (`uid`, `displayName`, `photoURL`, `membershipTier`, `createdAt`, `updatedAt`). Even so, `get` and `write` are restricted to the owner (`request.auth.uid == userId`), and `list` is forbidden.
   - `/users/{userId}/private/{docId}` isolates PII (`email`, `phone`, `shippingAddress`, `shippingCity`, `shippingPostalCode`, `shippingCountry`, `preferredSizeShoe`, `preferredSizeApparel`, `savedCardLast4`, `savedCardBrand`). Access is strictly restricted to the verified owner (`request.auth.uid == userId`), and `docId` must equal `'info'`.
4. **Master Gate & Relational Sync (Pillar 1 & Pillar 11)**:
   - `/orders/{orderId}` is the Master Source of Truth for order ownership (`userId == request.auth.uid`).
   - `/orders/{orderId}/items/{itemId}` and `/orders/{orderId}/events/{eventId}` are subcollections of `/orders/{orderId}`. Single-document operations (`get`, `create`) verify that the parent order `/orders/{orderId}` exists and `get(/databases/$(database)/documents/orders/$(orderId)).data.userId == request.auth.uid`.
   - Subcollection items and events are immutable after creation (`allow update, delete: if false;`).
5. **Query Enforcer & Cost-Optimization (Pillar 8)**:
   - `allow list` on `/orders/{orderId}`, `/orders/{orderId}/items/{itemId}`, and `/orders/{orderId}/events/{eventId}` NEVER uses `get()` or `exists()`. Instead, it enforces `resource.data.userId == request.auth.uid` (and `resource.data.orderId == orderId` on subcollections).
6. **Terminal State Locking & Action-Based Updates (Pillar 4 & Phase 4 #5, #6)**:
   - Once an order's `existing().shipmentStatus == 'Delivered'`, all further updates to `/orders/{orderId}` are strictly rejected.
   - Updates to `/orders/{orderId}` must pass `isValidOrder(incoming())`, preserve immutable fields (`orderNumber`, `userId`, `subtotal`, `shippingFee`, `totalAmount`, `itemCount`, `trackingNumber`, `createdAt`), enforce `incoming().updatedAt == request.time`, and match either the `isAdvanceShipmentAction` or `isUpdateShippingNoteAction` `affectedKeys().hasOnly(...)` allowlist.
7. **Temporal Integrity**:
   - All `create` operations enforce `incoming().createdAt == request.time` (and `incoming().updatedAt == request.time` where present).
   - All `update` operations enforce `incoming().updatedAt == request.time` and `incoming().createdAt == existing().createdAt`.

---

## 2. The "Dirty Dozen" Adversarial Payloads

1. **Payload 1 — Shadow Field Injection on Order Creation (Pillar 2)**:
   ```json
   {
     "orderNumber": "VA-9001",
     "userId": "user_alice",
     "isVipOverride": true
   }
   ```
   *Expected Result*: `PERMISSION_DENIED` via `data.keys().hasOnly(...)`.

2. **Payload 2 — Identity Spoofing on Order Creation (Pillar 2)**:
   Authenticated as `user_mallory`, attempting to create `/orders/ord_1` with `"userId": "user_alice"`.
   *Expected Result*: `PERMISSION_DENIED` via `data.userId == request.auth.uid`.

3. **Payload 3 — Unverified Email Write Attempt (Phase 4 Constraint)**:
   Authenticated as `user_alice` with `email_verified: false`, attempting to write `/users/user_alice`.
   *Expected Result*: `PERMISSION_DENIED` via `isVerifiedUser()`.

4. **Payload 4 — PII Cross-User Snooping (Pillar 6)**:
   Authenticated as `user_mallory`, attempting `get` on `/users/user_alice/private/info`.
   *Expected Result*: `PERMISSION_DENIED` via `isOwner(userId)`.

5. **Payload 5 — Blanket List Scraping on `/orders` (Pillar 8)**:
   Authenticated as `user_mallory`, executing an unconstrained `list` query across `/orders` containing documents owned by `user_alice`.
   *Expected Result*: `PERMISSION_DENIED` via `resource.data.userId == request.auth.uid`.

6. **Payload 6 — Orphaned Subcollection Write (Pillar 1 / Pillar 11)**:
   Authenticated as `user_alice`, attempting to create `/orders/non_existent_order/items/item_1` when `/orders/non_existent_order` does not exist.
   *Expected Result*: `PERMISSION_DENIED` via Master Gate `exists()` and `get()` check on parent order.

7. **Payload 7 — Terminal State Mutation on Delivered Order (Phase 4 #6)**:
   Authenticated as `user_alice`, attempting to update `shipmentStatus` from `'Delivered'` back to `'In Transit'` on `/orders/ord_delivered`.
   *Expected Result*: `PERMISSION_DENIED` via `existing().shipmentStatus != 'Delivered'`.

8. **Payload 8 — Unauthorized Price Tampering During Order Update (Pillar 4)**:
   Authenticated as `user_alice`, attempting to update `totalAmount: 1` along with `shipmentStatus: 'In Transit'` on `/orders/ord_1`.
   *Expected Result*: `PERMISSION_DENIED` via `affectedKeys().hasOnly(...)` and immutable field checks.

9. **Payload 9 — Path ID Poisoning Attack (Pillar 3)**:
   Authenticated as `user_alice`, attempting to create a document with invalid characters or excessive length in `{orderId}` (e.g. `order$bad!id`).
   *Expected Result*: `PERMISSION_DENIED` via `isValidId(orderId)`.

10. **Payload 10 — Value Poisoning on Whitelisted Update Key (Phase 5)**:
    Authenticated as `user_alice`, updating `shipmentStatus` (a whitelisted key) to `"HACKED_STATUS"` or a 10KB string.
    *Expected Result*: `PERMISSION_DENIED` via `isValidOrder(incoming())` enum and size bounds.

11. **Payload 11 — Client Timestamp Forgery (Phase 4 #13)**:
    Authenticated as `user_alice`, creating `/orders/ord_1` with a backdated `createdAt` timestamp (`request.time - 86400s`).
    *Expected Result*: `PERMISSION_DENIED` via `incoming().createdAt == request.time`.

12. **Payload 12 — Immutable `createdAt` Tampering on Update (Phase 4 #12)**:
    Authenticated as `user_alice`, updating `/users/user_alice` while mutating `createdAt` to `request.time`.
    *Expected Result*: `PERMISSION_DENIED` via `incoming().createdAt == existing().createdAt` and `affectedKeys().hasOnly(...)`.
