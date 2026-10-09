# Versioned serialized contracts

openapi/v1.json is generated from explicit Nest request/response DTO metadata.
src/generated/v1.ts is generated with openapi-typescript; src/index.ts publishes aliases
without independent handwritten HTTP definitions. Review generated schema changes.

From the repository root, build the API then run pnpm contracts:generate. pnpm verify checks
for drift before any build can regenerate files. Export/event contracts will have separate
versioned runtime schemas when those workflows arrive; they are not implemented yet.
