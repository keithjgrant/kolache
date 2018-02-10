import parseRule, { parseParams } from './parseRule';

it('should parse params', () => {
  expect(parseParams('"cpm-button" as .button')).toEqual({
    filename: '"cpm-button"',
    name: '.button',
  });
});
