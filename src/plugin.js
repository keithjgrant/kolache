import postcss from 'postcss';
import resolve from '@csstools/sass-import-resolve';
import transformRule from './transforms/transformRule';

const DEFAULT_OPTIONS = {
  importPaths: ['node_modules'],
  importPromise: [],
  importCache: {},
};

function resolveImport(opts) {
  return (id, cwd) => {
    return resolve(id, { cwd, readFile: true, cache: opts.importCache });
  };
}

export default postcss.plugin('postcss-kolache', opts => {
  return function (root, result) {
    opts = Object.assign(DEFAULT_OPTIONS, opts);
    opts.importResolve = Object(opts).resolve || resolveImport(opts);
    opts.result = result;

    const promises = [];

    root.walkAtRules('import', rule => {
      promises.push(transformRule(rule, opts));
    });

    return Promise.all(promises);
  };
});
