import transformImportAtRule from './transformImportAtRule';

export default function transformRule(rule, opts) {
  if (rule.type !== 'atrule') {
    return;
  }
  if (rule.name.toLowerCase() !== 'import') {
    return;
  }
  transformImportAtRule(rule, opts);
}

function getNodesArray(node) {
  return Array.from(Object(node).nodes || []);
}
