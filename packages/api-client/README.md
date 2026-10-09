# Typed operational HTTP client

Browser-native ES module. Path/method/request/response types derive from the generated
OpenAPI types in @supply-chain/contracts. Runtime request validation remains server-side.
The fetch transport accepts an abort signal and an in-memory scoped credential, applies
no-store and a bounded timeout, and raises ApiError for non-success HTTP responses.

Generate schema/types with pnpm contracts:generate after building the API. Verify checked-in
output with pnpm contracts:check. Build this package after client-source changes; pnpm dev:web
builds it before starting Vite. No credentials belong in URLs, query keys or local storage.
