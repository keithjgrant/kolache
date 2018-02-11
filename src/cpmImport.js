import postcss from 'postcss';
import { parseParams } from './import/parseRule';

import util from 'util';

export default postcss.plugin('postcss-cpm', opts => {
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
