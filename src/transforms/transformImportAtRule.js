// adapted from https://github.com/jonathantneal/postcss-advanced-variables
import postcss, { list } from 'postcss';
import path from 'path';
// import transformRule from './transformRule';
import replaceImportedPackage from './replaceImportedPackage';
import manageUnresolved from './manageUnresolved';

const processor = postcss();

export default function transformRule(rule, opts) {
  if (rule.type !== 'atrule') {
    return Promise.resolve();
  }
  if (rule.name.toLowerCase() !== 'import') {
    return Promise.resolve();
  }
  return transformImportAtRule(rule, opts);
}

// transform @import at-rules
export function transformImportAtRule(rule, opts) {
  // @import options
  const { id, alias, cwf, cwd } = getImportOpts(rule, opts);

  const cwds = [cwd].concat(opts.importPaths);

  // promise the resolved file and its contents using the file resolver
  const importPromise = cwds.reduce(
    (promise, thiscwd) =>
      promise.catch(() => opts.importResolve(id, thiscwd, opts)),
    Promise.reject()
  );

  return importPromise.then(
    // promise the processed file
    ({ file, contents }) => {
      return processor.process(contents, { from: file }).then(({ root }) => {
        // push a dependency message
        opts.result.messages.push({
          type: 'dependency',
          file,
          parent: cwf,
        });

        // imported nodes
        const nodes = root.nodes.slice(0);

        // replace the @import at-rule with the imported nodes
        if (alias) {
          // package import
          try {
            replaceImportedPackage(rule, nodes);
          } catch (e) {
            return manageUnresolved(
              rule,
              opts,
              '@import',
              `No matching @export found for "${id}"`
            );
          }
        } else {
          // normal partial import
          rule.replaceWith(nodes);
        }

        // transform all nodes from the import
        // transformNode({ nodes }, opts);
        const childPromises = [];
        nodes.forEach(child => {
          if (
            child.type === 'atrule' &&
            child.name.toLowerCase() === 'import'
          ) {
            childPromises.push(transformRule(child, opts));
          }
        });

        return Promise.all(childPromises);
      });
    },
    () => {
      // otherwise, if the @import could not be found
      manageUnresolved(
        rule,
        opts,
        '@import',
        `Could not resolve the @import for "${id}"`
      );
    }
  );
}

// return the @import statement options/details
function getImportOpts(node, opts) {
  const params = list.space(node.params);
  const rawid = params[0];
  let alias;
  if (isPackageImport(params)) {
    alias = params[2];
  }
  const id = trimWrappingURL(rawid);

  // current working file and directory
  const cwf =
    node.source && node.source.input && node.source.input.file ||
    opts.result.from;
  const cwd = cwf ? path.dirname(cwf) : opts.importRoot;

  return { id, alias, cwf, cwd };
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
