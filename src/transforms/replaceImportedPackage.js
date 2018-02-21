import postcss from 'postcss';
import { parseExportParams } from './parseParams';

export default function replaceImportedPackage(
  importRule,
  packageNodes,
  importParams
) {
  const exportedNodes = getExportedNodes(packageNodes, importParams);
  const parameters = {};
  const exportedRules = [];
  parameters.$name = postcss.decl({
    prop: '$name',
    value: importParams.alias,
    source: importRule.source,
  });
  exportedNodes.forEach(node => {
    if (node.type === 'decl') {
      parameters[node.prop] = node;
    } else {
      exportedRules.push(node);
    }
  });
  importRule.walk(decl => {
    if (decl.type === 'decl') {
      parameters[decl.prop] = decl;
    }
  });

  const newRule = postcss.rule({
    selector: '',
    raws: { semicolon: true },
  });
  importRule.parent.insertAfter(importRule, newRule);
  for (const prop in parameters) {
    newRule.append(parameters[prop]);
  }
  exportedRules.forEach(rule => {
    newRule.append(rule);
  });

  importRule.remove();
}

function getExportedNodes(packageNodes, importParams) {
  for (let i = 0; i < packageNodes.length; i++) {
    if (isMatchingExport(importParams, packageNodes[i])) {
      return packageNodes[i].nodes;
    }
  }

  throw new Error('No matching export found');
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
