import { Actions, Permissions } from '@modules/casl';
import { Roles } from '@modules/app/app.roles';

/** CASL feature module — controller chỉ dùng AccessGuard(admin). */
export const permissions: Permissions<Roles, string, Actions> = {
  admin() {},
};
