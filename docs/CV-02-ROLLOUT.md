# CV-02 rollout and recovery runbook

This runbook is for the approved CV persistence design. It does not authorize agent-side operations against shared Supabase or production services. The owner/operator must use the reviewed deployment procedure and least-privilege credentials.

## Preconditions

- Confirm the CV-02 backend, Auth account-deletion integration, focused tests and docs are merged/reviewed.
- Confirm the Supabase private bucket exists, is private, and has no public listing/download policy. Set `CV_STORAGE_KEY`, `CV_STORAGE_SECRET`, `CV_STORAGE_REGION`, `CV_STORAGE_BUCKET`, and `CV_STORAGE_ENDPOINT` only as private Laravel runtime environment values. Never put these values in Vercel `NEXT_PUBLIC_*`, source control, browser bundles, or AI service configuration.
- Confirm RLS is enabled on `user_cvs`, browser Data API access is not granted, and the Laravel DB role can perform the required operations.
- Review the exact migration SQL and `down()` behavior. Obtain a current database recovery point and test the recovery procedure on an isolated copy. Do not run `migrate:fresh`, reset, seed, or destructive rollback against shared data.
- Configure the host scheduler to run `php artisan schedule:run` each minute; Laravel schedules pending CV cleanup hourly. Verify the AI opt-in notice says CV text may be sent to the configured AI provider for roadmap analysis and explains applicable provider retention/privacy terms. The privacy ADR's DPA/legal review remains open; resolve the required notice and sign-off before public enablement.
- Record that deleting a CV/account from live Storage and PostgreSQL cannot guarantee immediate removal from provider backups. Supabase backup retention may preserve data for its configured period; communicate this limitation and do not promise instant physical erasure from backups.

## Controlled deployment order

1. Keep the frontend CV controls undeployed during backend preparation. Review the recovery plan, create the private bucket, and configure the Laravel-only S3 endpoint/bucket/access key/secret. Verify secrets do not appear in logs or client assets.
2. Apply the additive CV migration through the reviewed migration process. Verify the resulting table, constraints, partial unique index, and RLS settings with read-only checks.
3. Deploy the backend code and configure the Laravel host scheduler (`php artisan schedule:run`) so pending object cleanup is retried hourly.
4. Run the smoke checks below against an authorized test account and a non-production CV. Confirm cleanup retry is operational.
5. Deploy the frontend after backend and schema are healthy; enable the controls only after the privacy notice is present and approved.

## Smoke checks

- As guest, `GET /api/ai/cv`, upload, download, and delete return 401.
- As User, Contributor, and Admin, each account sees and downloads only its own CV. An Admin must receive no cross-user CV access.
- A regular AI-05 preview with a PDF persists no file or row. Saving requires explicit consent and a valid PDF; `GET` returns metadata only, never text, key, or URL.
- Replace a saved CV and verify the new file is active, the old text is cleared, and the old object is removed. Delete and verify the active row and object are gone.
- Simulate or inject Storage removal failure in the test environment: the API returns a safe failure, the CV is not retrievable, pending cleanup remains recorded, and retry can complete it. Account deletion must fail safely and keep the account active when any CV object cannot be verified as removed.
- Check application and browser logs/assets for absence of CV text, Storage credentials, object keys, and public links.

## Rollback and recovery

- If backend or frontend smoke checks fail, disable/hide the frontend controls and roll back the application release to the last known-good backend/frontend versions. Keep the additive table and bucket contents intact; do not automatically drop the table or bucket as a rollback step.
- If the migration fails, stop rollout and use the reviewed database recovery procedure. Do not run a reset or improvise manual deletes. Preserve any `pending_delete` records and objects for reconciliation.
- If Storage and database state diverge, keep affected CVs unavailable, identify rows by internal IDs/object keys through restricted operator tooling, retry cleanup, and reconcile only under the reviewed recovery procedure. Do not expose CV contents during investigation.
- Resume only after the failing component is corrected and the smoke checks pass. A forward fix is preferred when saved user data exists. Any destructive schema or object cleanup requires a separately reviewed recovery plan.

## Known limitations

Supabase database/Storage backups can retain deleted material for provider-defined retention periods. Application deletion governs active service access and cleanup, not instant erasure of backup media. The AI provider receives extracted CV text during roadmap analysis; provider retention and the outstanding privacy/legal review must be reflected in the user notice before production enablement.
