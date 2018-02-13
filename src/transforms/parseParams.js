import { list } from 'postcss';
import path from 'path';

// return the @import statement options/details
export function parseImportParams(node, opts) {
  const params = list.space(node.params);
  const rawid = params[0];
  let alias;
  if (isPackageImport(params)) {
    alias = params[2];
  }
  const [id, namedExport] = trimWrappingURL(rawid).split(':');

  // current working file and directory
  const cwf =
    node.source && node.source.input && node.source.input.file ||
    opts.result.from;
  const cwd = cwf ? path.dirname(cwf) : opts.importRoot;

  return { id, alias, cwf, cwd, namedExport };
}

// return a string with the wrapping url() and quotes trimmed
function trimWrappingURL(string) {
  return trimWrappingQuotes(string.replace(/^url\(([\W\w]*)\)$/, '$1'));
}

// return a string with the wrapping quotes trimmed
function trimWrappingQuotes(string) {
  return string.replace(/^("|')([\W\w]*)\1$/, '$2');
}

function isPackageImport(params) {
  return params.length === 3 && params[1].trim() === 'as';
}

export function parseExportParams(params) {
  const parts = list.space(params);
  if (parts[0] === 'as') {
    return trimWrappingQuotes(parts[1]);
  }
  return false;
}
