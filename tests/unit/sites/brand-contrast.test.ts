import { expect, it } from 'vitest';
import { readableBrandColor } from '../../../modules/sites/brand-contrast';

it('makes neon and white brands readable on light surfaces', () => {
  const green = readableBrandColor('#00ff00');
  expect(green).toMatch(/^#00[0-9a-f]{2}00$/);
  expect(parseInt(green.slice(3, 5), 16)).toBeLessThan(128);
  expect(readableBrandColor('#ffffff')).not.toBe('#ffffff');
  expect(readableBrandColor('#134e4a')).toBe('#134e4a');
});
it('lightens black brands on dark surfaces and handles invalid input', () => {
  expect(readableBrandColor('#000000', true)).not.toBe('#000000');
  expect(readableBrandColor('invalid')).toMatch(/^#[0-9a-f]{6}$/);
});
