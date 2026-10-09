import { DynamicModule, Global, Module } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { AccessService, AuditService, Database, PgAccessRepository, PgAuditRepository, Configuration, OidcValidator } from '@supply-chain/operations';
import { TenantGuard, RolesGuard } from './modules/identity/guard';
@Global()
@Module({})
export class PlatformModule {
  static forRoot(config: Configuration): DynamicModule {
    return { module: PlatformModule, providers: [
      { provide: Database, useFactory: () => new Database(config) },
      { provide: AccessService, useFactory: (db: Database) => new AccessService(new PgAccessRepository(db), new OidcValidator({ issuer: process.env.OIDC_ISSUER, audience: process.env.OIDC_AUDIENCE, sharedSecret: process.env.OIDC_SHARED_SECRET })), inject: [Database] },
      { provide: AuditService, useFactory: () => new AuditService(new PgAuditRepository(), { id: randomUUID, now: () => new Date().toISOString() }) },
      TenantGuard,
      RolesGuard,
    ], exports: [Database, AccessService, AuditService, TenantGuard, RolesGuard] };
  }
}
