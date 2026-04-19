import { AppController } from './../src/app.controller';

describe('AppController (health)', () => {
  it('returns the health payload', () => {
    const controller = new AppController();
    const response = controller.getHealth();

    expect(response).toMatchObject({
      name: 'Flat Expense Manager API',
      status: 'ok',
    });
    expect(typeof response.timestamp).toBe('string');
    expect(Number.isNaN(Date.parse(response.timestamp))).toBe(false);
  });
});
