import { CanActivate, ExecutionContext, Injectable, UnauthorizedException, SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AccessService, Actor } from '@supply-chain/operations';

export interface AuthorizedRequest {
  headers: Record<string, string | string[] | undefined>;
  method: string;
  id: string;
  actor: Actor;
}

// Server-owned annotation for commands that record read receipts without mutating business authority.
export const ReadOperation = () => SetMetadata('sc.readOperation', true);

export const ROLES_KEY = 'sc.roles';
export const Roles = (...roles: ('operator' | 'reader')[]) => SetMetadata(ROLES_KEY, roles);

@Injectable()
export class TenantGuard implements CanActivate {
  constructor(
    private readonly access: AccessService,
    private readonly reflector: Reflector
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthorizedRequest>();
    const header = request.headers.authorization;

    const isApiKey = typeof header === 'string' && /^Bearer [A-Za-z0-9_-]{43}$/.test(header);
    const isOidcJwt =
      typeof header === 'string' && /^Bearer [A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(header);

    if (!isApiKey && !isOidcJwt) {
      throw new UnauthorizedException('A scoped access credential or valid OIDC bearer token is required');
    }

    const token = header!.slice(7);
    const write =
      request.method !== 'GET' && this.reflector.get<boolean>('sc.readOperation', context.getHandler()) !== true;

    request.actor = {
      ...(await this.access.authorize(token, write)),
      correlationId: request.id,
    };
    return true;
  }
}

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<('operator' | 'reader')[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles || requiredRoles.length === 0) return true;
    const request = context.switchToHttp().getRequest<AuthorizedRequest>();
    return Boolean(request.actor && requiredRoles.includes(request.actor.role));
  }
}
