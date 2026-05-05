# Security Specification for CarMechs

## Data Invariants
1. A booking must have a valid `fullName` (string, max 128 chars).
2. A booking must have a valid `phone` (string, max 15 chars, matches digits).
3. A booking `status` must be one of: `['pending', 'confirmed', 'in-progress', 'completed', 'cancelled']`.
4. `createdAt` must be set to `request.time` on creation and be immutable.
5. Clients (non-admins) can ONLY create bookings. They cannot read or list them.
6. Admins (identified by document in `/admins/{uid}`) have full access.

## The Dirty Dozen Payloads (Rejection Targets)
1. **Identity Spoofing**: Attempt to create a booking with a fake `fullName` that is 5MB.
2. **State Shortcutting**: Attempt to create a booking with `status: 'completed'`.
3. **Malicious ID**: Attempt to create a booking at `/bookings/../../illegal_path`.
4. **Illegal Field**: Attempt to add an `isAdmin: true` field to a booking.
5. **Unauthorized Read**: A normal user trying to `list` all bookings.
6. **Unauthorized Update**: A customer trying to change their booking `status` to `confirmed`.
7. **Timestamp Fraud**: Setting `createdAt` to a historical or future date instead of `request.time`.
8. **Owner Hijack**: Attempting to update a booking's `phone` number after it's been created.
9. **Junk ID Poisoning**: Using a 1KB string as a document ID.
10. **Admin Privilege Escalation**: A normal user trying to create a document in `/admins/`.
11. **Type Mismatch**: Sending `phone: 12345` (number instead of string).
12. **PII Leak**: A normal user trying to `get` another customer's booking document.
