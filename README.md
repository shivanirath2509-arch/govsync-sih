# SevaSetu scholarship prototype

A working, private demonstration of cross-department scholarship verification.

Read [BACKEND-GUIDE.md](BACKEND-GUIDE.md) for the complete setup, demo scenarios, API contracts, sample API server, tests and next steps for real integrations.

## Included

- React scholarship form with explicit consent and source-labelled fields
- Four real HTTP sample APIs with fictional citizens
- Server-side eligibility, consent and ownership checks
- D1 persistence for applications, source records and audit events
- API explorer, mappings, request monitoring, consent revocation and receipts
- Standalone Node sample API server and integration tests

## Limits

No live government integration, real Aadhaar, actual scholarship award, email/SMS delivery, durable background queue, separate government-role identity or immutable audit ledger. Demo eligibility is illustrative. Use fictional records only.

Start with `npm run install:ci` and follow the guide for the database migration before running the application.
