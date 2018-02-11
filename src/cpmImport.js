import postcss from 'postcss';
import resolve from '@csstools/sass-import-resolve';
import { parseParams } from './import/parseRule';
import transformImportAtRule from './import/transformImportAtRule';

import util from 'util';

function resolveImport(opts) {
  return (id, cwd) => {
    return resolve(id, { cwd, readFile: true, cache: opts.importCache });
  };
}

export default postcss.plugin('postcss-cpm', opts => {
  return function (root, result) {
    opts.importPromise = [];
    opts.importPaths = Object(opts).importPaths || [];
    opts.importCache = Object(Object(opts).importCache);
    opts.importResolve = Object(opts).resolve || resolveImport(opts);
    opts.result = result;

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
      const importRule = postcss.atRule({
        name: 'import',
        params: param.filename,
        source: rule.source,
      });
      newRule.append(importRule);
      rule.remove();
      transformImportAtRule(importRule, opts);
    });

    return Promise.all(opts.importPromise);
  };
});
