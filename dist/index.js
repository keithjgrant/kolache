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

var slicedToArray = function () {
  function sliceIterator(arr, i) {
    var _arr = [];
    var _n = true;
    var _d = false;
    var _e = undefined;

    try {
      for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) {
        _arr.push(_s.value);

        if (i && _arr.length === i) break;
      }
    } catch (err) {
      _d = true;
      _e = err;
    } finally {
      try {
        if (!_n && _i["return"]) _i["return"]();
      } finally {
        if (_d) throw _e;
      }
    }

    return _arr;
  }

  return function (arr, i) {
    if (Array.isArray(arr)) {
      return arr;
    } else if (Symbol.iterator in Object(arr)) {
      return sliceIterator(arr, i);
    } else {
      throw new TypeError("Invalid attempt to destructure non-iterable instance");
    }
  };
}();

// return the @import statement options/details
function parseImportParams(node, opts) {
  var params = postcss.list.space(node.params);
  var rawid = params[0];
  var alias = void 0;
  if (isPackageImport(params)) {
    alias = params[2];
  }

  var _trimWrappingURL$spli = trimWrappingURL(rawid).split(':'),
      _trimWrappingURL$spli2 = slicedToArray(_trimWrappingURL$spli, 2),
      id = _trimWrappingURL$spli2[0],
      namedExport = _trimWrappingURL$spli2[1];

  // current working file and directory


  var cwf = node.source && node.source.input && node.source.input.file || opts.result.from;
  var cwd = cwf ? path.dirname(cwf) : opts.importRoot;

  return { id: id, alias: alias, cwf: cwf, cwd: cwd, namedExport: namedExport };
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

function parseExportParams(params) {
  var parts = postcss.list.space(params);
  if (parts[0] === 'as') {
    return trimWrappingQuotes(parts[1]);
  }
  return false;
}

function replaceImportedPackage(importRule, packageNodes, importParams) {
  var exportedNodes = getExportedNodes(packageNodes, importParams);
  var parameters = {};
  var exportedRules = [];
  parameters.$name = postcss__default.decl({
    prop: '$name',
    value: importParams.alias,
    source: importRule.source
  });
  exportedNodes.forEach(function (node) {
    if (node.type === 'decl') {
      parameters[node.prop] = node;
    } else {
      exportedRules.push(node);
    }
  });
  importRule.walk(function (decl) {
    if (decl.type === 'decl') {
      parameters[decl.prop] = decl;
    }
  });

  var newRule = postcss__default.rule({
    selector: '',
    raws: { semicolon: true }
  });
  importRule.parent.insertAfter(importRule, newRule);
  for (var prop in parameters) {
    newRule.append(parameters[prop]);
  }
  exportedRules.forEach(function (rule) {
    newRule.append(rule);
  });

  importRule.remove();
}

function getExportedNodes(packageNodes, importParams) {
  for (var i = 0; i < packageNodes.length; i++) {
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
  var exportAlias = parseExportParams(importedNode.params);
  return exportAlias === importParams.namedExport;
}

function manageUnresolved(node, opts, word, message) {
  if (opts.unresolved === 'warn') {
    node.warn(opts.result, message, { word: word });
  } else if (opts.unresolved !== 'ignore') {
    throw node.error(message, { word: word });
  }
}

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
  var importParams = parseImportParams(rule, opts);

  var cwds = [importParams.cwd].concat(opts.importPaths);

  // promise the resolved file and its contents using the file resolver
  var importPromise = cwds.reduce(function (promise, thiscwd) {
    return promise.catch(function () {
      return opts.importResolve(importParams.id, thiscwd, opts);
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
        parent: importParams.cwf
      });

      // imported nodes
      var nodes = root.nodes.slice(0);

      // replace the @import at-rule with the imported nodes
      if (importParams.alias) {
        // package import
        try {
          replaceImportedPackage(rule, nodes, importParams);
        } catch (e) {
          return manageUnresolved(rule, opts, '@import', 'No matching @export found for "' + importParams.id + '"');
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
    manageUnresolved(rule, opts, '@import', 'Could not resolve the @import for "' + importParams.id + '"');
  });
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
  importPaths: ["node_modules"]
};

var index = postcss__default.plugin("kolache", function (opts) {
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
