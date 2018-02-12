import postcss from 'postcss';
import parseParams from './parseParams';

export default function replaceImportedPackage(importRule, packageNodes) {
  const params = parseParams(importRule.params);
  const newRule = postcss.rule({
    selector: '',
    raws: { semicolon: true },
  });
  importRule.parent.insertAfter(importRule, newRule);
  importRule.walk(userRule => {
    newRule.append(userRule);
  });
  newRule.append(
    postcss.decl({
      prop: '$name',
      value: params.name,
      source: importRule.source,
    })
  );
  packageNodes.forEach(packageNode => {
    if (isMatchingExport(params, packageNode)) {
      newRule.append(packageNode.nodes);
    }
  });

  importRule.remove();
}

function isMatchingExport(importParams, node) {
  if (node.type !== 'atrule' || node.name !== 'export') {
    return false;
  }
  return true;
}
