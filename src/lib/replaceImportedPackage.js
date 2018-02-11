import postcss from 'postcss';
// import transformRule from './transformRule';
import { parseParams } from './parseRule';

export default function replaceImportedPackage(rule, nodes) {
  //
  const param = parseParams(rule.params);
  const newRule = postcss.rule({
    selector: '',
    raws: { semicolon: true },
  });
  rule.parent.insertAfter(rule, newRule);
  rule.walk(userRule => {
    newRule.append(userRule);
  });
  newRule.append(
    postcss.decl({
      prop: '$kolache_name',
      value: param.name,
      source: rule.source,
    })
  );
  nodes.forEach(packageRule => {
    newRule.append(packageRule);
  });

  rule.remove();
}
