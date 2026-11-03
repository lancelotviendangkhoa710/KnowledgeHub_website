# Bootstrap administrator access

## Account

| Field | Value |
| --- | --- |
| Email | `admin@knowledgehub.local` |
| Role | `admin` |
| Status | `active` |

## Password handling

- The database contains a bcrypt password hash only. A hash is one-way and cannot be decrypted to recover the password.
- The initial password is deliberately not stored in Git, this document, or any database column. Obtain it from the task owner through the team's approved secret-sharing channel.
- Change the bootstrap password immediately after the first successful login using `PUT /api/me/password`, then store the replacement in the team's secret manager.
- Never paste the password, a Sanctum bearer token, database password, or Supabase service-role key into an issue, pull request, source file, or chat visible to an untrusted audience.

## Why this is not JWT

JWT and passwords solve different problems. Laravel verifies the supplied password against its bcrypt hash during login. Only after that succeeds does Sanctum issue a bearer token. The token is not a password hash and must not be used as one.

## Recovery

An existing active administrator can manage user status through the admin API. If every administrator loses access, have the Identity/Auth owner reset the password through a reviewed, one-time operational procedure; do not replace the hash by hand without recording the change.
