import { createHmac, timingSafeEqual } from 'node:crypto';
import type { Actor } from '../domain/actor';
import type { OidcClaims, OidcConfig, OidcTokenValidator } from '../domain/oidc';

export class OidcValidator implements OidcTokenValidator {
  constructor(private readonly config: OidcConfig = {}) {}

  public validateToken(jwtString: string): Actor {
    const parts = jwtString.split('.');
    if (parts.length !== 3) {
      throw new Error('Malformed JWT structure: expected 3 dot-separated segments');
    }

    const [headerB64, payloadB64, signatureB64] = parts;

    let header: Record<string, unknown>;
    try {
      header = JSON.parse(Buffer.from(headerB64, 'base64url').toString('utf8'));
    } catch {
      throw new Error('Invalid JWT header encoding');
    }

    if (this.config.sharedSecret && header.alg === 'HS256') {
      const expectedSig = createHmac('sha256', this.config.sharedSecret)
        .update(`${headerB64}.${payloadB64}`)
        .digest('base64url');
      if (
        signatureB64.length !== expectedSig.length ||
        !timingSafeEqual(Buffer.from(signatureB64), Buffer.from(expectedSig))
      ) {
        throw new Error('Invalid JWT signature');
      }
    }

    let claims: OidcClaims;
    try {
      claims = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
    } catch {
      throw new Error('Invalid JWT payload encoding');
    }

    const now = Math.floor(Date.now() / 1000);

    if (typeof claims.exp !== 'number' || claims.exp <= now) {
      throw new Error('JWT token has expired');
    }

    if (typeof claims.nbf === 'number' && claims.nbf > now) {
      throw new Error('JWT token not active yet');
    }

    const expectedIssuer = this.config.issuer || process.env.OIDC_ISSUER;
    if (expectedIssuer && claims.iss && claims.iss !== expectedIssuer) {
      throw new Error(`Untrusted token issuer: ${claims.iss}`);
    }

    const expectedAudience = this.config.audience || process.env.OIDC_AUDIENCE;
    if (expectedAudience && claims.aud) {
      const auds = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
      if (!auds.includes(expectedAudience)) {
        throw new Error(`Token audience does not match expected client: ${expectedAudience}`);
      }
    }

    if (!claims.tenant_id) {
      throw new Error('Missing tenant_id claim in token');
    }

    const assignedRoles = claims.roles || (claims.role ? [claims.role] : ['reader']);
    const isOperator = assignedRoles.includes('operator') || assignedRoles.includes('admin');
    const role: 'operator' | 'reader' = isOperator ? 'operator' : 'reader';

    return {
      actorId: claims.sub || 'oidc-user',
      tenantId: claims.tenant_id,
      tenantName: claims.tenant_name || 'Pilot Tenant',
      timezone: claims.timezone || 'UTC',
      role,
    };
  }
}
