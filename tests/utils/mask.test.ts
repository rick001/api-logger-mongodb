import { maskRequestData, maskResponseData, DEFAULT_MASK_FIELDS } from '../../src/utils/mask';

describe('mask', () => {
  describe('maskRequestData', () => {
    it('masks password in body', () => {
      const result = maskRequestData(
        { body: { email: 'u@x.com', password: 'secret' } },
        ['password']
      );
      expect(result.body).toEqual({ email: 'u@x.com', password: '***MASKED***' });
    });

    it('masks nested keys', () => {
      const result = maskRequestData(
        { body: { user: { password: 'x', name: 'y' } } },
        ['password']
      );
      expect(result.body.user.password).toBe('***MASKED***');
      expect(result.body.user.name).toBe('y');
    });

    it('returns req as-is when maskFields is empty', () => {
      const req = { body: { password: 'x' } };
      expect(maskRequestData(req, [])).toBe(req);
    });
  });

  describe('maskResponseData', () => {
    it('masks token in response', () => {
      const result = maskResponseData({ token: 'abc', id: 1 }, ['token']);
      expect(result).toEqual({ token: '***MASKED***', id: 1 });
    });

    it('returns res as-is when maskFields empty or res null', () => {
      expect(maskResponseData({ x: 1 }, [])).toEqual({ x: 1 });
      expect(maskResponseData(null, ['token'])).toBe(null);
    });
  });

  describe('DEFAULT_MASK_FIELDS', () => {
    it('includes password and token', () => {
      expect(DEFAULT_MASK_FIELDS).toContain('password');
      expect(DEFAULT_MASK_FIELDS).toContain('token');
    });
  });
});
