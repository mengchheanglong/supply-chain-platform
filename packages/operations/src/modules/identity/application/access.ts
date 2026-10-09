import type { Actor } from '../domain/actor';
import type { OidcTokenValidator } from '../domain/oidc';
import { OperationalError } from '../../../platform/ports';

export interface AccessRepository { ready(): Promise<boolean>; findActor(token: string): Promise<Actor | undefined> }

export class AccessService {
  constructor(
    private readonly repository: AccessRepository,
    private readonly oidc?: OidcTokenValidator
  ) {}

  async authorize(token: string, write: boolean): Promise<Actor> {
    // Check if token is an OIDC JWT token (3 segments separated by dot)
    if (/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(token)) {
      if (!this.oidc) {
        throw new OperationalError(500, 'OIDC token validator is not configured');
      }
      try {
        const actor = this.oidc.validateToken(token);
        if (write && actor.role !== 'operator') {
          throw new OperationalError(403, 'An operator credential is required');
        }
        return actor;
      } catch (err) {
        if (err instanceof OperationalError) throw err;
        throw new OperationalError(401, `OIDC authentication failed: ${(err as Error).message}`);
      }
    }

    // Otherwise lookup in database repository (API Key)
    if (!await this.repository.ready()) throw new OperationalError(503, 'Operational persistence is not ready');
    const actor = await this.repository.findActor(token);
    if (!actor) throw new OperationalError(401, 'Access credential is invalid or revoked');
    if (write && actor.role !== 'operator') throw new OperationalError(403, 'An operator credential is required');
    return actor;
  }
}
