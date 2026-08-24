import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import { RolesGuard } from './roles.guard';

function buildContext(user: { role: Role } | undefined): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ user }),
    }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as unknown as ExecutionContext;
}

describe('RolesGuard', () => {
  it('allows an APPROVER to call an @Roles(APPROVER) endpoint', () => {
    const reflector = { getAllAndOverride: () => [Role.APPROVER] } as unknown as Reflector;
    const guard = new RolesGuard(reflector);

    expect(guard.canActivate(buildContext({ role: Role.APPROVER }))).toBe(true);
  });

  it('blocks a STAFF user from an @Roles(APPROVER) endpoint', () => {
    const reflector = { getAllAndOverride: () => [Role.APPROVER] } as unknown as Reflector;
    const guard = new RolesGuard(reflector);

    expect(() => guard.canActivate(buildContext({ role: Role.STAFF }))).toThrow(ForbiddenException);
  });

  it('blocks an unauthenticated request from an @Roles(APPROVER) endpoint', () => {
    const reflector = { getAllAndOverride: () => [Role.APPROVER] } as unknown as Reflector;
    const guard = new RolesGuard(reflector);

    expect(() => guard.canActivate(buildContext(undefined))).toThrow(ForbiddenException);
  });

  it('allows any authenticated user through when no @Roles metadata is present', () => {
    const reflector = { getAllAndOverride: () => undefined } as unknown as Reflector;
    const guard = new RolesGuard(reflector);

    expect(guard.canActivate(buildContext({ role: Role.STAFF }))).toBe(true);
  });
});
