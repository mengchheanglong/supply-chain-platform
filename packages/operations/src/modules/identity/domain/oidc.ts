import type { Actor } from './actor';

export interface OidcClaims {
  sub: string;
  iss?: string;
  aud?: string | string[];
  exp: number;
  nbf?: number;
  iat?: number;
  tenant_id: string;
  tenant_name?: string;
  timezone?: string;
  roles?: string[];
  role?: string;
}

export interface OidcConfig {
  issuer?: string;
  audience?: string;
  sharedSecret?: string;
}

export interface OidcTokenValidator {
  validateToken(jwtString: string): Actor;
}
