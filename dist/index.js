'use strict';

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

var postcss = _interopDefault(require('postcss'));
var util = _interopDefault(require('util'));
require('postcss-import');
var precss = _interopDefault(require('precss'));
require('postcss-advanced-variables');
require('postcss-atroot');
require('postcss-extend-rule');
require('postcss-nested');
require('postcss-preset-env');
require('postcss-property-lookup');
var postcssPartialImport = _interopDefault(require('postcss-partial-import'));

function parseParams(params) {
  const parts = params.split('as');
  if (parts.length !== 2) {
    throw new Error(`Invalid @cpm-import: ${params}`);
  }
  return {
    filename: parts[0].trim(),
    name: parts[1].trim(),
  };
}

var cpmImport = postcss.plugin('postcss-cpm', opts => {
  return function (root, result) {
    root.walkAtRules('cpm-import', rule => {
      const param = parseParams(rule.params);
      const newRule = postcss.rule({
        selector: '',
        raws: { semicolon: true },
      });
      rule.parent.insertAfter(rule, newRule);

      rule.walk(childNode => {
        newRule.append(childNode.clone());
      });
      newRule.append(
        postcss.decl({
          prop: '$cpm-name',
          value: param.name,
          source: rule.source,
        })
      );
      newRule.append(
        postcss.atRule({
          name: 'import',
          params: param.filename,
          source: rule.source,
        })
      );
      rule.remove();
    });
  };
});

postcss.plugin('postcss-cpm', opts => {
  return function (root, result) {
    root.walkAtRules('cpm-package', rule => {
      console.log('cpm-package', rule);
    });

    root.walkAtRules('cpm-import', rule => {});
  };
});

const logAST = postcss.plugin('postcss-log-ast', opts => {
  return function (root, result) {
    console.log(util.inspect(root, false, null));
  };
});

var index = postcss.plugin('kolache', opts => {
  opts = opts || {};

  const plugins = [
    // postcssImport,
    postcssPartialImport(opts),
    cpmImport(opts),
    postcssPartialImport(opts),
    // logAST,
    precss(opts),
    // postcssExtendRule,
    // postcssAdvancedVariables,
    // postcssPresetEnv,
    // postcssAtroot,
    // postcssPropertyLookup,
    // postcssNested,
  ];

  // initialize all plugins
  // const initializedPlugins = plugins.map(plugin => plugin(opts));

  // process css with all plugins
  return (root, result) =>
    plugins.reduce(
      (promise, plugin) => promise.then(() => plugin(result.root, result)),
      Promise.resolve()
    );
});

module.exports = index;
