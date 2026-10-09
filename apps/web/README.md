# Operations web application

React/Vite SPA with React Router and lazy feature routes. TanStack Query stores server state
under tenant and session keys. Connection changes cancel requests and discard the old cache.
Credentials stay in memory. The ES-module client is typed from generated OpenAPI output.

Facility/SKU forms show genuine server failures. Pages consume cursor pagination and clear
stale rows after a failed refresh. Local form state survives a rejected write for correction.

From the repository root: pnpm build, then pnpm dev:web. The latter builds the client package
before Vite. Rebuild shared packages after editing them. pnpm test:web runs session, pagination,
outage and unconfirmed-write cases. Disposable browser verification uses pnpm test:browser.
PLATFORM_API_ORIGIN is a Vite development proxy override used by that isolated harness.

Inventory is a lazy feature route with paged master selectors, balance/reconciliation,
reservation and movement pages. Operators issue source-referenced commands; readers query.
Unconfirmed writes retain the request/key, disable editing and allow explicit identical retry.
This pending state lasts while the feature is mounted; keep the page open until resolved.
