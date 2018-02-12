'use strict';

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

var postcss = require('postcss');
var postcss__default = _interopDefault(postcss);
var path = _interopDefault(require('path'));
var resolve = _interopDefault(require('@csstools/sass-import-resolve'));
var precss = _interopDefault(require('precss'));

var injectNormalize = postcss__default.plugin('postcss-inject-normalize', function (opts) {
  return function (root) {
    if (!opts.includeNormalize) {
      return;
    }
    var first = root.nodes[0];
    if (first && first.type === 'atrule' && first.name === 'charset') {
      root.insertAfter(first, {
        type: 'atrule',
        name: 'import',
        params: '"normalize.css/normalize.css"'
      });
    } else {
      root.prepend({
        type: 'atrule',
        name: 'import',
        params: '"normalize.css/normalize.css"'
      });
    }
  };
});

function parseParams(params) {
  var parts = params.split('as');
  if (parts.length !== 2) {
    throw new Error('Invalid @cpm-import: ' + params);
  }
  return {
    filename: parts[0].trim(),
    name: parts[1].trim()
  };
}

function replaceImportedPackage(importRule, packageNodes) {
  var params = parseParams(importRule.params);
  var matchingExportContents = null;

  packageNodes.forEach(function (packageNode) {
    if (isMatchingExport(params, packageNode)) {
      matchingExportContents = packageNode.nodes;
    }
  });

  if (!matchingExportContents) {
    throw new Error('No matching export found');
  }

  var newRule = postcss__default.rule({
    selector: '',
    raws: { semicolon: true }
  });
  importRule.parent.insertAfter(importRule, newRule);
  importRule.walk(function (userRule) {
    newRule.append(userRule);
  });
  newRule.append(postcss__default.decl({
    prop: '$name',
    value: params.name,
    source: importRule.source
  }));
  newRule.append(matchingExportContents);

  importRule.remove();
}

function isMatchingExport(importParams, node) {
  if (node.type !== 'atrule' || node.name !== 'export') {
    return false;
  }
  return true;
}

function manageUnresolved(node, opts, word, message) {
  if (opts.unresolved === 'warn') {
    node.warn(opts.result, message, { word: word });
  } else if (opts.unresolved !== 'ignore') {
    throw node.error(message, { word: word });
  }
}

// adapted from https://github.com/jonathantneal/postcss-advanced-variables
// import transformRule from './transformRule';
var processor = postcss__default();

function transformRule(rule, opts) {
  if (rule.type !== 'atrule') {
    return Promise.resolve();
  }
  if (rule.name.toLowerCase() !== 'import') {
    return Promise.resolve();
  }
  return transformImportAtRule(rule, opts);
}

// transform @import at-rules
function transformImportAtRule(rule, opts) {
  // @import options
  var _getImportOpts = getImportOpts(rule, opts),
      id = _getImportOpts.id,
      alias = _getImportOpts.alias,
      cwf = _getImportOpts.cwf,
      cwd = _getImportOpts.cwd;

  var cwds = [cwd].concat(opts.importPaths);

  // promise the resolved file and its contents using the file resolver
  var importPromise = cwds.reduce(function (promise, thiscwd) {
    return promise.catch(function () {
      return opts.importResolve(id, thiscwd, opts);
    });
  }, Promise.reject());

  return importPromise.then(
  // promise the processed file
  function (_ref) {
    var file = _ref.file,
        contents = _ref.contents;

    return processor.process(contents, { from: file }).then(function (_ref2) {
      var root = _ref2.root;

      // push a dependency message
      opts.result.messages.push({
        type: 'dependency',
        file: file,
        parent: cwf
      });

      // imported nodes
      var nodes = root.nodes.slice(0);

      // replace the @import at-rule with the imported nodes
      if (alias) {
        // package import
        try {
          replaceImportedPackage(rule, nodes);
        } catch (e) {
          // throw e;
          return manageUnresolved(rule, opts, '@import', 'No matching @export found for "' + id + '"');
        }
      } else {
        // normal partial import
        rule.replaceWith(nodes);
      }

      // transform all nodes from the import
      // transformNode({ nodes }, opts);
      var childPromises = [];
      nodes.forEach(function (child) {
        if (child.type === 'atrule' && child.name.toLowerCase() === 'import') {
          childPromises.push(transformRule(child, opts));
        }
      });

      return Promise.all(childPromises);
    });
  }, function () {
    // otherwise, if the @import could not be found
    manageUnresolved(rule, opts, '@import', 'Could not resolve the @import for "' + id + '"');
  });
}

// return the @import statement options/details
function getImportOpts(node, opts) {
  var params = postcss.list.space(node.params);
  var rawid = params[0];
  var alias = void 0;
  if (isPackageImport(params)) {
    alias = params[2];
  }
  var id = trimWrappingURL(rawid);

  // current working file and directory
  var cwf = node.source && node.source.input && node.source.input.file || opts.result.from;
  var cwd = cwf ? path.dirname(cwf) : opts.importRoot;

  return { id: id, alias: alias, cwf: cwf, cwd: cwd };
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

var DEFAULT_OPTIONS = {
  importPaths: ['node_modules'],
  importPromise: [],
  importCache: {}
};

function resolveImport(opts) {
  return function (id, cwd) {
    return resolve(id, { cwd: cwd, readFile: true, cache: opts.importCache });
  };
}

var kolachePlugin = postcss__default.plugin('postcss-kolache', function (opts) {
  return function (root, result) {
    opts = Object.assign(DEFAULT_OPTIONS, opts);
    opts.importResolve = Object(opts).resolve || resolveImport(opts);
    opts.result = result;

    var promises = [];

    root.walkAtRules('import', function (rule) {
      promises.push(transformRule(rule, opts));
    });

    return Promise.all(promises);
  };
});

var DEFAULT_OPTIONS$1 = {
  includeNormalize: true,
  importPaths: ['node_modules']
};

var index = postcss__default.plugin('kolache', function (opts) {
  opts = Object.assign({}, DEFAULT_OPTIONS$1, opts);

  var plugins = [injectNormalize(opts), kolachePlugin(opts), precss(opts)];

  return function (root, result) {
    return plugins.reduce(function (promise, plugin) {
      return promise.then(function () {
        return plugin(result.root, result);
      });
    }, Promise.resolve());
  };
});

module.exports = index;
