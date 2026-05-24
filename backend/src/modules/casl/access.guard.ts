import {
  CanActivate,
  Injectable,
  ExecutionContext,
  mixin,
  Type,
} from '@nestjs/common';
import { ModuleRef, Reflector } from '@nestjs/core';

import { Roles } from '@modules/app/app.roles';
import { AccessService } from '@modules/casl';
import { AbilityMetadata } from '@modules/casl/interfaces/ability-metadata.interface';
import { CASL_META_ABILITY } from '@modules/casl/casl.constants';
import { ContextProxy } from '@modules/casl/proxies/context.proxy';
import { CaslConfig } from '@modules/casl/casl.config';
import { RequestProxy } from '@modules/casl/proxies/request.proxy';
import { userHookFactory } from '@modules/casl/factories/user-hook.factory';
import { subjectHookFactory } from '@modules/casl/factories/subject-hook.factory';

export function AccessGuard(requiredRole?: string): Type<CanActivate> {
  @Injectable()
  class RoleBasedAccessGuard implements CanActivate {
    constructor(
      private reflector: Reflector,
      private readonly accessService: AccessService,
      private moduleRef: ModuleRef,
    ) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
      const ability = this.reflector.get<AbilityMetadata | undefined>(
        CASL_META_ABILITY,
        context.getHandler(),
      );

      const request = await ContextProxy.create(context).getRequest();
      const { getUserHook } = CaslConfig.getRootOptions();
      const req = new RequestProxy(request);

      req.setUserHook(await userHookFactory(this.moduleRef, getUserHook));
      req.setSubjectHook(
        await subjectHookFactory(this.moduleRef, ability?.subjectHook),
      );

      const user = request?.user;
      // If no role is required, everyone has access
      if (!requiredRole) {
        return true;
      }

      // Admins have access to all routes
      if (user && user.role && user.role === Roles.admin) {
        return true;
      }

      // Check if the user has the required role
      if (!user || !user.role || user.role !== requiredRole) {
        return false;
      }

      return this.accessService.canActivateAbility(request, ability);
    }
  }

  return mixin(RoleBasedAccessGuard);
}
