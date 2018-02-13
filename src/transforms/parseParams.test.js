import { parseImportParams, parseExportParams } from './parseParams';

it('should return standard params', () => {
  const node = {
    params: '"partial"',
    source: {
      input: {
        file: '/foo/bar/style.css',
      },
    },
  };
  expect(parseImportParams(node, {})).toEqual({
    id: 'partial',
    cwd: '/foo/bar',
    cwf: '/foo/bar/style.css',
    alias: undefined,
  });
});

it('should return params with package alias', () => {
  const node = {
    params: '"button" as .button',
    source: {
      input: {
        file: '/foo/bar/style.css',
      },
    },
  };
  expect(parseImportParams(node, {})).toEqual({
    id: 'button',
    cwd: '/foo/bar',
    cwf: '/foo/bar/style.css',
    alias: '.button',
  });
});

it('should return params with package alias', () => {
  const node = {
    params: '"button:variant" as .button',
    source: {
      input: {
        file: '/foo/bar/style.css',
      },
    },
  };
  expect(parseImportParams(node, {})).toEqual({
    id: 'button',
    cwd: '/foo/bar',
    cwf: '/foo/bar/style.css',
    alias: '.button',
    namedExport: 'variant',
  });
});

it('should get export name', () => {
  expect(parseExportParams(' as "variant"')).toEqual('variant');
});
