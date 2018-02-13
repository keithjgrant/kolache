import postcss from 'postcss';
import replaceImportedPackage from './replaceImportedPackage';
import manageUnresolved from './manageUnresolved';
import { parseImportParams } from './parseParams';

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
  const importParams = parseImportParams(rule, opts);

  const cwds = [importParams.cwd].concat(opts.importPaths);

  // promise the resolved file and its contents using the file resolver
  const importPromise = cwds.reduce(
    (promise, thiscwd) =>
      promise.catch(() => opts.importResolve(importParams.id, thiscwd, opts)),
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
          parent: importParams.cwf,
        });

        // imported nodes
        const nodes = root.nodes.slice(0);

        // replace the @import at-rule with the imported nodes
        if (importParams.alias) {
          // package import
          try {
            replaceImportedPackage(rule, nodes, importParams);
          } catch (e) {
            return manageUnresolved(
              rule,
              opts,
              '@import',
              `No matching @export found for "${importParams.id}"`
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
        `Could not resolve the @import for "${importParams.id}"`
      );
    }
  );
}
