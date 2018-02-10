import postcss from 'postcss';
import postcssImport from 'postcss-import';
import precss from 'precss';
import cpm from './src/cpm';

const plugins = [
  postcssImport,
  cpm,
  precss,
];

export default postcss.plugin('postcss-cpm', opts => {
  opts = opts || {};

  // initialize all plugins
  const initializedPlugins = plugins.map(
    plugin => plugin(opts)
  );

  // process css with all plugins
  return (root, result) => initializedPlugins.reduce(
    (promise, plugin) => promise.then(
      () => plugin(result.root, result)
    ),
    Promise.resolve()
  );
});
