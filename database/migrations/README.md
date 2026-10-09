# Business migration ownership

Operational migrations belong here. Run pnpm migrate as the non-superuser operations_app.
SQL files apply transactionally under an advisory lock; checksums in sc_schema_migrations
reject changed/missing applied files. The initial migration creates sc_-prefixed identity,
facility, SKU and audit tables in public with forced tenant row policies on domain records.
The parent supplies the database, roles and PostGIS. Its default snapshot SELECT grants
are explicitly revoked for credentials, tenant identities, audits and migration metadata.
Snapshot authorization/export remains DATA-01/02; role grants alone do not authorize tenants.
