import BaseContext from '@tests/e2e/context/base-context';

export default function HealthModule(ctx: BaseContext) {
  describe('Health', () => {
    it('GET /health returns ok', async () => {
      const res = await ctx.request.get('/health').expect(200);
      expect(res.body).toBeDefined();
    });
  });
}
