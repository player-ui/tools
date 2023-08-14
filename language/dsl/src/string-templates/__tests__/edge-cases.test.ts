import { isTemplateStringInstance } from '..';

test('isTemplateStringInstance with null', () => {
  expect(isTemplateStringInstance(null)).toBe(false);
});
