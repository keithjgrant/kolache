import postcss from 'postcss';
import parseParams from './parseParams';

export default function replaceImportedPackage(importRule, packageNodes) {
  const params = parseParams(importRule.params);
  let matchingExportContents = null;

  packageNodes.forEach(packageNode => {
    if (isMatchingExport(params, packageNode)) {
      matchingExportContents = packageNode.nodes;
    }
  });

  if (!matchingExportContents) {
    throw new Error('No matching export found');
  }

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
  newRule.append(matchingExportContents);

  importRule.remove();
}

function isMatchingExport(importParams, node) {
  if (node.type !== 'atrule' || node.name !== 'export') {
    return false;
  }
  return true;
}
