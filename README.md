# Kolache [![Build Status][ci-img]][ci]

Import and distribute CSS packages.

[postcss]: https://github.com/postcss/postcss
[ci-img]: https://travis-ci.org/keithjgrant/postcss-cpm.svg
[ci]: https://travis-ci.org/keithjgrant/postcss-cpm

Importing a Kolache package (in main.css):

```css
@import 'button' as .button;
```

Defining a Kolache package (in button.css):

```css
@export {
  $(name) {
    display: inline-block;
    padding: 0.5em;
    background-color: blue;
  }
}
```

## Usage

```js
postcss([require('kolache')]);
```

See [PostCSS] docs for examples for your environment.
