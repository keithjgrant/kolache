import postcss from 'postcss';
import precss from 'precss';
import kolachePlugin from './src/plugin';

export default postcss.plugin('kolache', opts => {
  opts = opts || {};

  const plugins = [kolachePlugin(opts), precss(opts)];

  return (root, result) =>
    plugins.reduce(
      (promise, plugin) => promise.then(() => plugin(result.root, result)),
      Promise.resolve()
    );
});
