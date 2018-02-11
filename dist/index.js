'use strict';

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

var postcss = require('postcss');
var postcss__default = _interopDefault(postcss);
var path = _interopDefault(require('path'));
var resolve = _interopDefault(require('@csstools/sass-import-resolve'));
var util = _interopDefault(require('util'));
require('postcss-import');
require('precss');
require('postcss-advanced-variables');
require('postcss-atroot');
require('postcss-extend-rule');
require('postcss-nested');
require('postcss-preset-env');
require('postcss-property-lookup');
require('postcss-partial-import');

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

function manageUnresolved(node, opts, word, message) {
  if (opts.unresolved === 'warn') {
    node.warn(opts.result, message, { word });
  } else if (opts.unresolved !== 'ignore') {
    throw node.error(message, { word });
  }
}

// adapted from https://github.com/jonathantneal/postcss-advanced-variables
// import transformNode from './transform-node';
const processor = postcss__default();

// transform @import at-rules
function transformImportAtRule(rule, opts) {
  // @import options
  const { id, alias, cwf, cwd } = getImportOpts(rule, opts);

  const cwds = [cwd].concat(opts.importPaths);
  console.log('all CWDS', cwds);

  // promise the resolved file and its contents using the file resolver
  const importPromise = cwds.reduce(
    (promise, thiscwd) =>
      promise.catch(() => opts.importResolve(id, thiscwd, opts)),
    Promise.reject()
  );

  opts.importPromise.push(
    importPromise.then(
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
          // TODO change to an append?
          rule.replaceWith(nodes);

          // transform all nodes from the import
          // transformNode({ nodes }, opts);
          getNodesArray(nodes).forEach(child => {
            if (
              child.type === 'atrule' &&
              child.name.toLowerCase() === 'import'
            ) {
              transformImportAtRule(child, opts);
            }
          });
          // nodes.walkAtRules('import', childRule => {
          //   transformImportAtrule(childRule, opts);
          // });
        }),
      e => {
        console.log(e, e.message);
        // otherwise, if the @import could not be found
        manageUnresolved(
          rule,
          opts,
          '@import',
          `Could not resolve the @import for "${id}"`
        );
      }
    )
  );
}

// return the @import statement options/details
function getImportOpts(node, opts) {
  const [rawid, ...alias] = postcss.list.space(node.params);
  const id = trimWrappingURL(rawid);

  // current working file and directory
  console.log('import node: ', node.source, opts.result);
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

function getNodesArray(node) {
  return Array.from(Object(node).nodes || []);
}

function resolveImport(opts) {
  return (id, cwd) => {
    console.log('CWD', cwd);
    return resolve(id, { cwd, readFile: true, cache: opts.importCache });
  };
}

var cpmImport = postcss__default.plugin('postcss-cpm', opts => {
  return function (root, result) {
    opts.importPromise = [];
    opts.importPaths = Object(opts).importPaths || [];
    opts.importCache = Object(Object(opts).importCache);
    opts.importResolve = Object(opts).resolve || resolveImport(opts);
    opts.result = result;

    root.walkAtRules('cpm-import', rule => {
      const param = parseParams(rule.params);
      const newRule = postcss__default.rule({
        selector: '',
        raws: { semicolon: true },
      });
      rule.parent.insertAfter(rule, newRule);

      rule.walk(childNode => {
        newRule.append(childNode.clone());
      });
      newRule.append(
        postcss__default.decl({
          prop: '$cpm-name',
          value: param.name,
          source: rule.source,
        })
      );
      const importRule = postcss__default.atRule({
        name: 'import',
        params: param.filename,
        source: rule.source,
      });
      newRule.append(importRule);
      rule.remove();
      transformImportAtRule(importRule, opts);
    });

    return Promise.all(opts.importPromise);
  };
});

postcss__default.plugin('postcss-cpm', opts => {
  return function (root, result) {
    root.walkAtRules('cpm-package', rule => {
      console.log('cpm-package', rule);
    });

    root.walkAtRules('cpm-import', rule => {});
  };
});

const logAST = postcss__default.plugin('postcss-log-ast', opts => {
  return function (root, result) {
    console.log(util.inspect(root, false, null));
  };
});

var index = postcss__default.plugin('kolache', opts => {
  opts = opts || {};

  const plugins = [
    cpmImport(opts),
    // logAST,
    // precss(opts),
    // postcssExtendRule,
    // postcssAdvancedVariables,
    // postcssPresetEnv,
    // postcssAtroot,
    // postcssPropertyLookup,
    // postcssNested,
  ];

  // initialize all plugins
  // const initializedPlugins = plugins.map(plugin => plugin(opts));

  // process css with all plugins
  return (root, result) =>
    plugins.reduce(
      (promise, plugin) => promise.then(() => plugin(result.root, result)),
      Promise.resolve()
    );
});

module.exports = index;
