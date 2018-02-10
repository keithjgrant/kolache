import postcss from 'postcss';
import { parseParams } from './cpmImport/parseRule';

export default postcss.plugin('postcss-cpm', opts => {
  return function (root, result) {
    root.walkAtRules('cpm-import', rule => {
      const param = parseParams(rule.params);
      rule.type = 'rule';
      rule.selector = '';
      rule.raws.semicolon = true;
      rule.prepend({
        prop: '$cpm-name',
        value: param.name,
      });
      rule.append({
        name: 'import',
        params: param.filename,
      });
    });
  };
});
