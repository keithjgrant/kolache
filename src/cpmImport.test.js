import postcss from 'postcss';
import cpmImport from './cpmImport';

function run(input, output, opts) {
  if (typeof opts === 'undefined') {
    opts = {};
  }
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
@cpm-import "custom-button" as .button;
  `,
    `
{
    $cpm-name: .button;
    @import "custom-button";
}
  `
  );
});

it('should insert package with custom vars', () => {
  return run(
    `
@cpm-import "custom-button" as .button {
  $border-radius: 1em;
  $color: inherit;
}
  `,
    `
{
  $cpm-name: .button;
  $border-radius: 1em;
  $color: inherit;
  @import "custom-button";
}
  `
  );
});
