import postcss from 'postcss';
import precss from 'precss';
import cpmImport from './src/cpmImport';

// import util from 'util';

// const logAST = postcss.plugin('postcss-log-ast', opts => {
//   return function (root, result) {
//     console.log(util.inspect(root, false, null));
//   };
// });

export default postcss.plugin('kolache', opts => {
  opts = opts || {};

  const plugins = [
    cpmImport(opts),
    // logAST,
    precss(opts),
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
