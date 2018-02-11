import postcss from 'postcss';
import plugin from './index';

function run(input, output, opts) {
  if (typeof opts === 'undefined') {
    opts = {};
  }
  return postcss([plugin(opts)])
    .process(input)
    .then(result => {
      expect(result.css.trim()).toEqual(output.trim());
      expect(result.warnings().length).toBe(0);
    });
}

it('does something', () => {
  return run('a{ }', 'a{ }');
});

it('evaluates basic variables', () => {
  return run(
    `
$foo: 1em;

.bar {
  padding: $foo;
}`,
    `
.bar {
  padding: 1em;
}`
  );
});

it('block scopes basic variables', () => {
  return run(
    `
$foo: 1em;

{
  $foo: 2em;
  .bar {
    padding: $foo;
  }
}`,
    `
  .bar {
    padding: 2em;
  }`
  );
});

it('allows dot in variable value', () => {
  return run(
    `
    $foo: .my-selector;
    $(foo) {
      color: green;
    }
  `,
    `
    .my-selector {
      color: green;
    }
  `
  );
});
