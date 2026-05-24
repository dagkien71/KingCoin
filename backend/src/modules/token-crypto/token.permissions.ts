import { InferSubjects } from '@casl/ability';

import { Actions, Permissions } from '@modules/casl';
import TokenCryptoEntity from '@modules/token-crypto/entities/token-crypto.entity';
import { Roles } from '@modules/app/app.roles';

export type Subjects = InferSubjects<typeof TokenCryptoEntity>;

export const permissions: Permissions<Roles, Subjects, Actions> = {
  everyone({ can }) {
    can(Actions.read, TokenCryptoEntity);
  },

  user({ user, can }) {
    can(Actions.update, TokenCryptoEntity, { id: user.id });
  },
};
