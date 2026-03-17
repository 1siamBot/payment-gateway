import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ApiKeyStatus } from '@prisma/client';
import { createHash } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { AUTHORIZE_ROLES_KEY, AppRole } from './authz.decorator';

type AuthContext = {
  role: AppRole;
  merchantId?: string;
  apiKeyId?: string;
};

type RequestLike = {
  headers: Record<string, string | string[] | undefined>;
  query?: Record<string, unknown>;
  body?: unknown;
  params?: Record<string, unknown>;
};

export type AuthenticatedRequest = RequestLike & {
  auth?: AuthContext;
};

@Injectable()
export class AuthzGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const roles = this.reflector.getAllAndOverride<AppRole[]>(
      AUTHORIZE_ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!roles?.length) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const merchantAuth = await this.tryAuthenticateMerchant(request);

    if (merchantAuth) {
      if (!roles.includes('merchant')) {
        throw new ForbiddenException('Merchant credentials are not allowed for this endpoint');
      }
      request.auth = merchantAuth;
      this.enforceMerchantScope(request, merchantAuth.merchantId!);
      return true;
    }

    const internalAuth = this.authenticateInternal(request);
    if (!internalAuth) {
      throw new UnauthorizedException('Missing valid authentication');
    }

    if (!roles.includes(internalAuth.role)) {
      throw new ForbiddenException(`Role "${internalAuth.role}" is not allowed for this endpoint`);
    }

    request.auth = internalAuth;
    return true;
  }

  private authenticateInternal(request: RequestLike): AuthContext | null {
    const token = this.headerValue(request, 'x-internal-token');
    const role = this.headerValue(request, 'x-actor-role');
    const expectedToken = process.env.INTERNAL_API_TOKEN ?? 'dev-internal-token';

    if (!token && !role) {
      return null;
    }

    if (token !== expectedToken) {
      throw new UnauthorizedException('Invalid internal token');
    }

    if (role !== 'admin' && role !== 'ops' && role !== 'support') {
      throw new UnauthorizedException('Invalid internal role');
    }

    return { role };
  }

  private async tryAuthenticateMerchant(
    request: RequestLike,
  ): Promise<AuthContext | null> {
    const apiKey = this.headerValue(request, 'x-api-key');
    const merchantId = this.headerValue(request, 'x-merchant-id');

    if (!apiKey && !merchantId) {
      return null;
    }

    if (!apiKey || !merchantId) {
      throw new UnauthorizedException('Both x-api-key and x-merchant-id are required');
    }

    const keyHash = createHash('sha256').update(apiKey).digest('hex');
    const match = await this.prisma.apiKey.findFirst({
      where: {
        merchantId,
        keyHash,
        status: ApiKeyStatus.ACTIVE,
      },
      select: {
        id: true,
      },
    });

    if (!match) {
      throw new UnauthorizedException('Invalid merchant API key');
    }

    return {
      role: 'merchant',
      merchantId,
      apiKeyId: match.id,
    };
  }

  private enforceMerchantScope(request: AuthenticatedRequest, merchantId: string): void {
    const queryMerchantId = this.extractMerchantId(request.query);
    const bodyMerchantId = this.extractMerchantId(request.body);
    const paramsMerchantId = this.extractMerchantId(request.params);

    const providedValues = [queryMerchantId, bodyMerchantId, paramsMerchantId].filter(
      (value): value is string => Boolean(value),
    );

    if (providedValues.some((value) => value !== merchantId)) {
      throw new ForbiddenException('Merchant scope mismatch');
    }

    if (request.query && !queryMerchantId) {
      request.query = { ...request.query, merchantId };
    }

    if (request.body && typeof request.body === 'object' && !bodyMerchantId) {
      request.body = { ...request.body, merchantId };
    }
  }

  private extractMerchantId(
    source: unknown,
  ): string | undefined {
    if (!source || typeof source !== 'object') {
      return undefined;
    }
    const value = (source as Record<string, unknown>).merchantId;
    return typeof value === 'string' && value.length ? value : undefined;
  }

  private headerValue(request: RequestLike, key: string): string | null {
    const value = request.headers[key];
    if (Array.isArray(value)) {
      return value[0] ?? null;
    }
    return typeof value === 'string' ? value : null;
  }
}
