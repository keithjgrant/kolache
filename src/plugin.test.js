import postcss from 'postcss';
import path from 'path';
import plugin from './plugin';

function run(input, output, opts) {
  if (typeof opts === 'undefined') {
    opts = {
      importPaths: [path.resolve(__dirname, '../fixtures')],
    };
  }

  return postcss([plugin(opts)])
    .process(input)
    .then(result => {
      expect(result.css.trim()).toEqual(output.trim());
      expect(result.warnings().length).toBe(0);
    });
}

it('should insert basic package', () => {
  return run(
    `
@import "static-button" as .button;
  `,
    `
{
$name: .button;$(name) {
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
@import "static-button" as .button {
  $border-radius: 1em;
  $color: inherit;
}
  `,
    `
{
  $border-radius: 1em;
  $color: inherit;
  $name: .button;$(name) {
  display: inline-block;
  padding: 0.3em;
}
}
  `
  );
});

it('should import package nested in a partial', () => {
  return run(
    `
@import "partial";
    `,
    `
    .partial {
  color: green;
}

 {
  $name: .button;$(name) {
  display: inline-block;
  padding: 0.3em;
}
}

    `
  );
});
