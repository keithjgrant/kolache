'use strict';

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

var postcss = _interopDefault(require('postcss'));
var postcssImport = _interopDefault(require('postcss-import'));
var precss = _interopDefault(require('precss'));

var cpmPackage = postcss.plugin('postcss-cpm', opts => {
  return function (root, result) {
    root.walkAtRules('cpm-package', rule => {
      console.log('cpm-package', rule);
    });

    root.walkAtRules('cpm-import', rule => {});
  };
});

const plugins = [cpmPackage, postcssImport, cpmPackage, precss];

var index = postcss.plugin('postcss-cpm', opts => {
  opts = opts || {};

  // initialize all plugins
  const initializedPlugins = plugins.map(plugin => plugin(opts));

  // process css with all plugins
  return (root, result) =>
    initializedPlugins.reduce(
      (promise, plugin) => promise.then(() => plugin(result.root, result)),
      Promise.resolve()
    );
});

module.exports = index;
