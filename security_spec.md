# Security Specification: CarMechs Deployment

## 1. Data Invariants
- A **Booking** cannot exist without a valid service name, customer name, and status. The `price` must be a positive number.
- A **Feedback** must reference a valid `bookingId`.
- **Technician** profiles are public for viewing but can only be modified by admins.
- **Support Tickets** are private to the user who created them.
- **Admin Tasks** are strictly restricted to admin users.
- User **Roles** are immutable by the user themselves to prevent privilege escalation.

## 2. The "Dirty Dozen" Payloads (Rejected Cases)

1. **Identity Spoofing**: Attempt to create a booking for another user's email.
2. **Privilege Escalation**: Attempt to update own user profile `role` to 'admin'.
3. **Shadow Update**: Attempt to inject `isVerified: true` into a booking.
4. **Orphaned Feedback**: Create feedback for a non-existent `bookingId`.
5. **PII Leak**: Non-admin attempting to list all user profiles.
6. **Price Manipulation**: Creating a booking with `price: 0`.
7. **Invalid ID**: Creating a document with a 2KB garbage string as ID.
8. **Resource Exhaustion**: Sending a 1MB string in a `message` field.
9. **Illegal State Transition**: Updating a 'completed' booking back to 'pending'.
10. **Unauthorized Support Access**: Reading another user's `tickets`.
11. **Admin Bypass**: Attempting to write to `config/settings`.
12. **Spam Referral**: Creating 1000 referral records in 1 minute (throttling check).

## 3. The Test Runner (Plan)
I will implement `firestore.rules.test.ts` to verify these constraints.
