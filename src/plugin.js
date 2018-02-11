import postcss from 'postcss';
import resolve from '@csstools/sass-import-resolve';
import transformRule from './lib/transformRule';

function resolveImport(opts) {
  return (id, cwd) => {
    return resolve(id, { cwd, readFile: true, cache: opts.importCache });
  };
}

export default postcss.plugin('postcss-kolache', opts => {
  return function (root, result) {
    opts.importPromise = [];
    opts.importPaths = Object(opts).importPaths || [];
    opts.importCache = Object(Object(opts).importCache);
    opts.importResolve = Object(opts).resolve || resolveImport(opts);
    opts.result = result;

    const promises = [];

    root.walkAtRules('import', rule => {
      promises.push(transformRule(rule, opts));
    });

    return Promise.all(promises);
  };
});
