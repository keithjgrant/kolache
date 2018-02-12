'use strict';

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

var postcss = require('postcss');
var postcss__default = _interopDefault(postcss);
var path = _interopDefault(require('path'));
var resolve = _interopDefault(require('@csstools/sass-import-resolve'));
var precss = _interopDefault(require('precss'));

function parseParams(params) {
  const parts = params.split('as');
  if (parts.length !== 2) {
    throw new Error(`Invalid @cpm-import: ${params}`);
  }
  return {
    filename: parts[0].trim(),
    name: parts[1].trim(),
  };
}

// import transformRule from './transformRule';
function replaceImportedPackage(rule, nodes) {
  //
  const param = parseParams(rule.params);
  const newRule = postcss__default.rule({
    selector: '',
    raws: { semicolon: true },
  });
  rule.parent.insertAfter(rule, newRule);
  rule.walk(userRule => {
    newRule.append(userRule);
  });
  newRule.append(
    postcss__default.decl({
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

function manageUnresolved(node, opts, word, message) {
  if (opts.unresolved === 'warn') {
    node.warn(opts.result, message, { word });
  } else if (opts.unresolved !== 'ignore') {
    throw node.error(message, { word });
  }
}

// adapted from https://github.com/jonathantneal/postcss-advanced-variables
const processor = postcss__default();

// transform @import at-rules
function transformImportAtRule(rule, opts) {
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
    ({ file, contents }) =>
      processor.process(contents, { from: file }).then(({ root }) => {
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
          replaceImportedPackage(rule, nodes);
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
      }),
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
  const params = postcss.list.space(node.params);
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

function transformRule(rule, opts) {
  if (rule.type !== 'atrule') {
    return Promise.resolve();
  }
  if (rule.name.toLowerCase() !== 'import') {
    return Promise.resolve();
  }
  return transformImportAtRule(rule, opts);
}

function resolveImport(opts) {
  return (id, cwd) => {
    return resolve(id, { cwd, readFile: true, cache: opts.importCache });
  };
}

var kolachePlugin = postcss__default.plugin('postcss-kolache', opts => {
  return function (root, result) {
    opts.importPromise = [];
    opts.importPaths = Object(opts).importPaths || [];
    opts.importCache = Object(Object(opts).importCache);
    opts.importResolve = Object(opts).resolve || resolveImport(opts);
    opts.result = result;

    const promises = [];

    root.walkAtRules('import', rule => {
      promises.push(transformRule(rule, opts));
    });

    return Promise.all(promises);
  };
});

var index = postcss__default.plugin('kolache', opts => {
  opts = opts || {};

  const plugins = [kolachePlugin(opts), precss(opts)];

  return (root, result) =>
    plugins.reduce(
      (promise, plugin) => promise.then(() => plugin(result.root, result)),
      Promise.resolve()
    );
});

module.exports = index;
