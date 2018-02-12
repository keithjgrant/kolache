import postcss from 'postcss';
import kolache from './index';

function run(input, output, opts) {
  if (typeof opts === 'undefined') {
    opts = {
      includeNormalize: false,
    };
  }
  return postcss([kolache(opts)])
    .process(input, { from: undefined })
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

it('variables fall out of scope after block ends', () => {
  return run(
    `
$foo: 1em;

{
  $foo: 2em;
  .bar {
    padding: $foo;
  }
}
.baz {
  padding: $foo;
}`,
    `
  .bar {
    padding: 2em;
  }
.baz {
  padding: 1em;
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

it('should import normalize.css', () => {
  return postcss([kolache()])
    .process('', { from: undefined })
    .then(result => {
      expect(result.css.trim()).toMatchSnapshot();
      expect(result.warnings().length).toBe(0);
    });
});

it('should import normalize.css after any @charset', () => {
  return postcss([kolache()])
    .process('@charset "utf-8"; .foo{ color: green; }', { from: undefined })
    .then(result => {
      expect(result.css.trim()).toMatchSnapshot();
      expect(result.warnings().length).toBe(0);
    });
});
