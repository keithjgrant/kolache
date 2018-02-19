# Kolache

[![Build Status][ci-img]][ci]

Import and distribute configurable CSS packages via npm.

[postcss]: https://github.com/postcss/postcss
[ci-img]: https://travis-ci.org/keithjgrant/kolache.svg
[ci]: https://travis-ci.org/keithjgrant/kolache

Full documentation at [kolache.keithjgrant.com](https://kolache.keithjgrant.com).

```scss
/* main.css */
@import 'button' as .button;
@import 'button:variant' as .button--danger {
  $color: red;
}

/* button.css */
@export {
  $(name) {
    display: inline-block;
    padding: 0.5em;
    border: 1px solid blue;
    background-color: blue;
  }
}

@export as 'variant' {
  $(name) {
    border-color: $color;
    color: $color;
  }
}
```

Compiles to:

```css
.button {
  display: inline-block;
  padding: 0.5em;
  border: 1px solid blue;
  background-color: blue;
}

.button--danger {
  border-color: red;
  color: red;
}
```

## Usage

```js
postcss([require('kolache')]);
```

See [PostCSS] docs for examples for your environment.
