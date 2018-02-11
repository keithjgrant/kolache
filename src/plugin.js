import postcss from 'postcss';
import resolve from '@csstools/sass-import-resolve';
import { parseParams } from './lib/parseRule';
import transformRule from './lib/transformRule';
import transformImportAtRule from './lib/transformImportAtRule';

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

    root.walkAtRules('import', rule => {
      transformRule(rule, opts);
      // const param = parseParams(rule.params);
      // const newRule = postcss.rule({
      //   selector: '',
      //   raws: { semicolon: true },
      // });
      // rule.parent.insertAfter(rule, newRule);
      //
      // rule.walk(childNode => {
      //   newRule.append(childNode.clone());
      // });
      // newRule.append(
      //   postcss.decl({
      //     prop: '$cpm-name',
      //     value: param.name,
      //     source: rule.source,
      //   })
      // );
      // const importRule = postcss.atRule({
      //   name: 'import',
      //   params: param.filename,
      //   source: rule.source,
      // });
      // newRule.append(importRule);
      // rule.remove();
      // transformImportAtRule(importRule, opts);
    });

    return Promise.all(opts.importPromise);
  };
});
