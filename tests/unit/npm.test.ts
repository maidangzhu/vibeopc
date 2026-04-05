import { incrementVersion } from '@/lib/npm';

describe('npm utilities', () => {
  describe('incrementVersion', () => {
    it('递增 patch 版本号', () => {
      expect(incrementVersion('1.0.0')).toBe('1.0.1');
      expect(incrementVersion('1.2.3')).toBe('1.2.4');
      expect(incrementVersion('0.0.1')).toBe('0.0.2');
    });

    it('递增已有的 patch 版本', () => {
      expect(incrementVersion('2.1.0')).toBe('2.1.1');
    });
  });
});
