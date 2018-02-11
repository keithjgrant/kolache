import postcss from 'postcss';
import path from 'path';
import cpmImport from './cpmImport';

function run(input, output, opts) {
  if (typeof opts === 'undefined') {
    opts = {
      importPaths: [path.resolve(__dirname, '../tests/fixtures')],
    };
  }
  console.log(__dirname);
  return postcss([cpmImport(opts)])
    .process(input)
    .then(result => {
      expect(result.css.trim()).toEqual(output.trim());
      expect(result.warnings().length).toBe(0);
    });
}

it('should insert basic package', () => {
  return run(
    `
@cpm-import "static-button" as .button;
  `,
    `
{
$cpm-name: .button;$(cpm-name) {
  display: inline-block;
  padding: 0.3em;
}
}
  `
  );
});

it('should insert package with custom vars', () => {
  return run(
    `
@cpm-import "static-button" as .button {
  $border-radius: 1em;
  $color: inherit;
}
  `,
    `
{
  $border-radius: 1em;
  $color: inherit;
  $cpm-name: .button;$(cpm-name) {
  display: inline-block;
  padding: 0.3em;
}
}
  `
  );
});
