import { SignUpDto } from '@modules/auth/dto/register';
import { User } from '@prisma/client';
import { AUTH_SIGN_UP } from '@tests/e2e/common/routes';
import DefaultContext from '@tests/e2e/context/default-context';

export default (ctx: DefaultContext) => {
  let user: User;
  let signUpDto: SignUpDto;

  beforeAll(async () => {
    user = await ctx.service.createUser();
  });

  beforeEach(async () => {
    signUpDto = ctx.service.getSignUpData();
  });

  it('should return USER_CONFLICT exception', async () => {
    const busyEmailDto: SignUpDto = {
      email: user.email,
      password: user.password,
      username: user.username,
    };

    return ctx.request.post(AUTH_SIGN_UP).send(busyEmailDto).expect(409);
  });
};
