const postcss = require('postcss');
const plugin = require('../dist');

function run(input, output, opts) {
  if (typeof opts === 'undefined') {
    opts = {};
  }
  return postcss([ plugin(opts) ]).process(input)
    .then(result => {
      expect(result.css).toEqual(output);
      expect(result.warnings().length).toBe(0);
    });
}

it('does something', () => {
  return run('a{ }', 'a{ }');
});

it('evaluates basic variables', () => {
  return run(`
$foo: 1em;

.bar {
  padding: $foo;
}`, `
.bar {
  padding: 1em;
}`);
});

it('scopes basic variables', () => {
  return run(`
$foo: 1em;

.bar {
  $foo: 2em;
  padding: $foo;
}`, `
.bar {
  padding: 2em;
}`);
});
