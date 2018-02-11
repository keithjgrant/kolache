import postcss from 'postcss';
import postcssImport from 'postcss-import';
import precss from 'precss';
import cpmImport from './src/cpmImport';
import cpmPackage from './src/cpmPackage';
import postcssAdvancedVariables from 'postcss-advanced-variables';
import postcssAtroot from 'postcss-atroot';
import postcssExtendRule from 'postcss-extend-rule';
import postcssNested from 'postcss-nested';
import postcssPresetEnv from 'postcss-preset-env';
import postcssPropertyLookup from 'postcss-property-lookup';
import postcssPartialImport from 'postcss-partial-import';

import util from 'util';

const logAST = postcss.plugin('postcss-log-ast', opts => {
  return function (root, result) {
    console.log(util.inspect(root, false, null));
  };
});

export default postcss.plugin('kolache', opts => {
  opts = opts || {};

  const plugins = [
    cpmImport(opts),
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
