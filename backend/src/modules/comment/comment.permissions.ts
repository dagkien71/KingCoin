import { InferSubjects } from '@casl/ability';
import { Actions, Permissions } from '@modules/casl';
import { Roles } from '@modules/app/app.roles';
import CommentEntity from './entities/comment.entity';

export type Subjects = InferSubjects<typeof CommentEntity>;

export const permissions: Permissions<Roles, Subjects, Actions> = {
  everyone({ can }) {
    can(Actions.read, CommentEntity);
  },

  user({ user, can }) {
    can(Actions.create, CommentEntity);
    can(Actions.delete, CommentEntity, { userId: user.id });
  },

  admin({ can }) {
    can(Actions.manage, CommentEntity);
    can(Actions.delete, CommentEntity);
  },
};
