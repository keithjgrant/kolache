import postcss from 'postcss';
import { parseExportParams } from './parseParams';

export default function replaceImportedPackage(
  importRule,
  packageNodes,
  importParams
) {
  let matchingExportContents = null;

  packageNodes.forEach(packageNode => {
    if (
      !matchingExportContents &&
      isMatchingExport(importParams, packageNode)
    ) {
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
      value: importParams.alias,
      source: importRule.source,
    })
  );
  newRule.append(matchingExportContents);

  importRule.remove();
}

function isMatchingExport(importParams, importedNode) {
  if (importedNode.type !== 'atrule' || importedNode.name !== 'export') {
    return false;
  }
  if (!importParams.namedExport && importedNode.params.trim() === '') {
    return true;
  }
  const exportAlias = parseExportParams(importedNode.params);
  return exportAlias === importParams.namedExport;
}
