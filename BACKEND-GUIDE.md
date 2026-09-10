# SevaSetu: backend and sample API guide

This source package contains a working scholarship prototype. It has a React interface, server API routes, Cloudflare D1 persistence, source normalization, consent enforcement and eligibility checks. Department records are fictional. The criteria are illustrative and do not represent an actual scheme.

## Start with the live prototype

1. Sign in to your private Sites workspace.
2. Select **Asha Sharma / DEMO-1001**.
3. Tick all four department permissions and choose **Authorize & fetch records**.
4. Review the auto-filled fields. The label beneath each field identifies its source.
5. Review the contact email and statement, tick the confirmation and submit.
6. Open My applications, Operations overview, Data mappings and Audit trail.
7. For a new run, choose New application from another view.

Additional scenarios:
- **Rohan / DEMO-1002:** income is INR 420,000, above the demo limit of INR 250,000. The server blocks submission.
- **Meera / DEMO-1003:** Identity and Education report different birth dates. Review is required, and submission is blocked.
- **Income outage:** tick the optional outage control before fetching. The income endpoint returns HTTP 503. Recover & retry turns the simulated outage off and retries verification.
- **Consent revoked:** authorize a draft, go to Consent records, and revoke. API Explorer requests then receive HTTP 403. Historical records remain saved. Start a new application to grant permission again.

## What frontend, backend, database and APIs mean here

The frontend is what you click. It is implemented in `app/workspace.tsx`, `app/apply.tsx` and `app/views.tsx`.

The backend runs on a server. It checks that you own the application, verifies consent, returns sample departmental information, standardizes data, evaluates rules and saves a submission. Its entrypoint is `app/api/[[...path]]/route.ts`.

D1 is the database. It stores applications, consent details, department responses and audit events. Tables are declared in `db/schema.ts`. SQL migrations are in `drizzle/`.

An API is the agreed HTTP interface between software components. These sample endpoints are genuine server endpoints. They return invented records from `lib/demo.ts` rather than calling live government systems.

This implementation runs on a Cloudflare-compatible server using the Sites Vinext starter. It does not run an Express server, PostgreSQL, Redis, BullMQ, Socket.IO, Kafka or AI. Those technologies are not needed to demonstrate this bounded workflow. The browser coordinates the four verification requests while the server enforces each permission and the final eligibility decision. Closing the page pauses the browser sequence; saved checks can be resumed. This is not yet a durable background job system.

## Run the complete prototype locally

Requirements: Node.js 22.13 or later and npm. Extract the source ZIP, open a terminal in the extracted project folder, then run:

```sh
npm run install:ci
npm run build
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_warm_captain_flint.sql
npm run dev -- --hostname 127.0.0.1
```

Apply that migration once to a fresh local database. Do not replay it against an already-initialized database. It creates the tables; it does not load citizen records. Sample citizen fixtures live in source code.

Open the Local URL printed by the server. Choose **Sign in to workspace**. The local starter simulates the user `seedy@sites.test`; this is not real OAuth. The hosted private Site uses the platform's sign-in and access controls.

If PowerShell blocks npm.ps1, use `npm.cmd` in place of `npm`. On a normal computer, no other setup should be necessary. In restricted Windows environments, Drizzle's bundled tsx can fail when reading the OS username. Existing migrations are already included, so local startup does not require generating them again.

After changing the schema, generate a new migration with `npm run db:generate`, inspect the SQL, rebuild if bindings changed, and apply only the new migration locally. Sites applies packaged migrations during publishing.

## Test the full backend

Keep the local development server running. In a second terminal:

```sh
node scripts/test-api.mjs
```

The test requires the local preview sign-in helper. It refuses non-local URLs. It creates fictional local application records and checks authentication, rejection of forged identity headers, validation, outages, eligibility, source conflicts, revocation, repeat submission and persisted records. Test data is intentionally retained in the local database and is not deployed as production seed data.

## API contract

All full-prototype endpoints require the signed-in workspace identity. Do not hard-code user identity headers in a production client. Sites adds the trusted identity at its server boundary.

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/workspace` | Latest 100 applications and 200 audit events belonging to the signed-in user |
| POST | `/api/applications` | Create application and consent |
| GET | `/api/applications/:id` | Read an owned application and its department checks |
| GET | `/api/departments/identity/:citizenId?applicationId=:id` | Retrieve identity fixture after consent checks |
| GET | `/api/departments/education/:citizenId?applicationId=:id` | Retrieve education fixture |
| GET | `/api/departments/income/:citizenId?applicationId=:id` | Retrieve income fixture |
| GET | `/api/departments/residence/:citizenId?applicationId=:id` | Retrieve residence fixture |
| POST | `/api/applications/:id/evaluate` | Evaluate saved source records on the server |
| POST | `/api/applications/:id/submit` | Validate and save eligible submission |
| POST | `/api/applications/:id/revoke` | Revoke permission for further reads or submission |

Create request:

```json
{
  "citizenId": "DEMO-1001",
  "scopes": ["identity", "education", "income", "residence"],
  "accepted": true
}
```

Save the returned `application.id`. Use it as the `applicationId` query parameter for each of the four department requests. Then POST `{}` to its evaluate endpoint. Do not supply marks or income in the evaluation request: the server reads stored provider records.

Submit request:

```json
{
  "email": "asha@example.test",
  "statement": "I am applying for this sample scholarship to support my undergraduate studies.",
  "confirmed": true
}
```

The email is saved only. No notification is sent. The server ignores additional supplied profile fields and only accepts contact details and a statement for an eligible application.

Important response codes: 400 invalid input; 401 sign-in required; 403 wrong citizen or revoked/expired consent; 404 unknown route or application not owned by the user; 409 incomplete checks, ineligibility or invalid transition; 503 temporary service/storage failure. Add `&simulate=unavailable` to a department URL to demonstrate HTTP 503.

## Make your first independent sample API in two minutes

The package includes `scripts/sample-api.mjs`. It uses Node's built-in HTTP server, so it needs no dependency installation:

```sh
node scripts/sample-api.mjs
```

Open these URLs:

- `http://127.0.0.1:4000/api/education/DEMO-1001` returns a sample education record.
- `http://127.0.0.1:4000/api/education/DEMO-9999` returns 404.
- `http://127.0.0.1:4000/api/education/DEMO-1001?simulate=unavailable` returns 503.

A request is like asking a question: “What education record belongs to DEMO-1001?” The server selects the fixture and sends a JSON response. Add more citizens to the `records` object to expand it. An unknown citizen should return an error rather than someone else's details.

This standalone learning server listens only on your computer and has no authentication. It is separate from the consent-protected APIs used by the full prototype. Do not expose it publicly or put real records in it.

### Optional Express equivalent

If your team prefers Express, create a separate empty practice folder, run `npm init -y`, then `npm install express`. Save the following as `server.cjs` and run `node server.cjs`:

```js
const express = require('express');
const app = express();
const records = {
  'DEMO-1001': { student_name: 'Asha Sharma', percentage: 88.5 }
};
app.get('/api/education/:citizenId', (req, res) => {
  const record = records[req.params.citizenId];
  if (!record) return res.status(404).json({ error: 'Sample citizen not found' });
  res.json({ sample: true, data: record });
});
app.listen(4000, '127.0.0.1');
```

Stop the first sample server before using the same port. This Express example is educational, not the deployed implementation. For a full Express port, implement the same routes and validations, connect a persistent database, add approved sign-in and role checks, and point the frontend to the server. Keep browser and API under the same origin where possible.

## How the data mapper works

Education uses `student_name`, `dob` and `percentage`; Identity uses `full_name` and `birth_date`. `normalize()` maps them to common names. Education dates convert from DD/MM/YYYY to YYYY-MM-DD. `assess()` compares name and birth date between Identity and Education. A conflict leads to `needs_review` instead of guessing. These simple fixtures do not demonstrate a universal identity-matching or master-data-management system.

To add a department: extend the department list and fixture in `lib/demo.ts`, define a mapping, update the required consent scopes and frontend labels, add relevant validation/rules, and extend the integration test. For a real connector, validate the provider's payload before normalization and retain its source metadata.

## What remains before real government use

1. Authorized departmental APIs and access agreements. Never scrape or bypass access controls to imitate integration.
2. Approved citizen identity and server-enforced officer/auditor roles. The prototype's navigation views do not establish these roles.
3. Verified official eligibility rules, data contracts, source identifiers and conflict-review procedures.
4. Department credentials stored as server secrets, scoped authorization, request limits, timeouts and audit policy.
5. A durable job queue with retry limits, idempotency, exception review and recovery. Manual retry here demonstrates the concept only.
6. Appropriate data minimization, encryption/key management, retention/deletion, consent renewal and backup/recovery.
7. Security and performance testing with the responsible departments before handling actual personal information.
8. An approved email/SMS service if notifications are required. Use real status callbacks or polling rather than claiming instant updates when departments cannot provide them.

The current database records consent for 24 hours. Revocation blocks future access and submission but does not erase past records. Audit records are ordinary persistent rows; they are not cryptographically immutable. Submission means received for demo review, not approved or paid.

## Official learning references

- Node HTTP server documentation: https://nodejs.org/api/http.html
- Express Hello World: https://expressjs.com/en/starter/hello-world.html
- Cloudflare D1 documentation: https://developers.cloudflare.com/d1/

The working project source is the authority for this prototype's specific behavior.
