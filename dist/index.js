'use strict';

function _interopDefault(ex) {
  return ex && typeof ex === 'object' && 'default' in ex ? ex.default : ex;
}

let postcss = require('postcss');
let postcss__default = _interopDefault(postcss);
let path = _interopDefault(require('path'));
let resolve = _interopDefault(require('@csstools/sass-import-resolve'));
let precss = _interopDefault(require('precss'));

let injectNormalize = postcss__default.plugin(
  'postcss-inject-normalize',
  opts => {
    return function (root) {
      if (!opts.includeNormalize) {
        return;
      }
      let first = root.nodes[0];
      if (first && first.type === 'atrule' && first.name === 'charset') {
        root.insertAfter(first, {
          type: 'atrule',
          name: 'import',
          params: '"normalize.css/normalize.css"',
        });
      } else {
        root.prepend({
          type: 'atrule',
          name: 'import',
          params: '"normalize.css/normalize.css"',
        });
      }
    };
  }
);

let slicedToArray = (function () {
  function sliceIterator(arr, i) {
    let _arr = [];
    let _n = true;
    let _d = false;
    let _e = undefined;

    try {
      for (
        var _i = arr[Symbol.iterator](), _s;
        !(_n = (_s = _i.next()).done);
        _n = true
      ) {
        _arr.push(_s.value);

        if (i && _arr.length === i) break;
      }
    } catch (err) {
      _d = true;
      _e = err;
    } finally {
      try {
        if (!_n && _i.return) _i.return();
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
      throw new TypeError(
        'Invalid attempt to destructure non-iterable instance'
      );
    }
  };
}());

// return the @import statement options/details
function parseImportParams(node, opts) {
  let params = postcss.list.space(node.params);
  let rawid = params[0];
  let alias = void 0;
  if (isPackageImport(params)) {
    alias = params[2];
  }

  let _trimWrappingURL$spli = trimWrappingURL(rawid).split(':'),
    _trimWrappingURL$spli2 = slicedToArray(_trimWrappingURL$spli, 2),
    id = _trimWrappingURL$spli2[0],
    namedExport = _trimWrappingURL$spli2[1];

  // current working file and directory

  let cwf =
    node.source && node.source.input && node.source.input.file ||
    opts.result.from;
  let cwd = cwf ? path.dirname(cwf) : opts.importRoot;

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

function parseExportParams(params) {
  let parts = postcss.list.space(params);
  if (parts[0] === 'as') {
    return trimWrappingQuotes(parts[1]);
  }
  return false;
}

function replaceImportedPackage(importRule, packageNodes, importParams) {
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

  let newRule = postcss__default.rule({
    selector: '',
    raws: { semicolon: true },
  });
  importRule.parent.insertAfter(importRule, newRule);
  importRule.walk(userRule => {
    newRule.append(userRule);
  });
  newRule.append(
    postcss__default.decl({
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
  let exportAlias = parseExportParams(importedNode.params);
  return exportAlias === importParams.namedExport;
}

function manageUnresolved(node, opts, word, message) {
  if (opts.unresolved === 'warn') {
    node.warn(opts.result, message, { word });
  } else if (opts.unresolved !== 'ignore') {
    throw node.error(message, { word });
  }
}

let processor = postcss__default();

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
  let importParams = parseImportParams(rule, opts);

  let cwds = [importParams.cwd].concat(opts.importPaths);

  // promise the resolved file and its contents using the file resolver
  let importPromise = cwds.reduce((promise, thiscwd) => {
    return promise.catch(() => {
      return opts.importResolve(importParams.id, thiscwd, opts);
    });
  }, Promise.reject());

  return importPromise.then(
    // promise the processed file
    _ref => {
      let file = _ref.file,
        contents = _ref.contents;

      return processor.process(contents, { from: file }).then(_ref2 => {
        let root = _ref2.root;

        // push a dependency message
        opts.result.messages.push({
          type: 'dependency',
          file,
          parent: importParams.cwf,
        });

        // imported nodes
        let nodes = root.nodes.slice(0);

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
              'No matching @export found for "' + importParams.id + '"'
            );
          }
        } else {
          // normal partial import
          rule.replaceWith(nodes);
        }

        // transform all nodes from the import
        // transformNode({ nodes }, opts);
        let childPromises = [];
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
        'Could not resolve the @import for "' + importParams.id + '"'
      );
    }
  );
}

let DEFAULT_OPTIONS = {
  importPaths: ['node_modules'],
  importPromise: [],
  importCache: {},
};

function resolveImport(opts) {
  return function (id, cwd) {
    return resolve(id, { cwd, readFile: true, cache: opts.importCache });
  };
}

let kolachePlugin = postcss__default.plugin('postcss-kolache', opts => {
  return function (root, result) {
    opts = Object.assign(DEFAULT_OPTIONS, opts);
    opts.importResolve = Object(opts).resolve || resolveImport(opts);
    opts.result = result;

    let promises = [];

    root.walkAtRules('import', rule => {
      promises.push(transformRule(rule, opts));
    });

    return Promise.all(promises);
  };
});

let DEFAULT_OPTIONS$1 = {
  includeNormalize: true,
  importPaths: ['node_modules'],
};

let index = postcss__default.plugin('kolache', opts => {
  opts = Object.assign({}, DEFAULT_OPTIONS$1, opts);

  let plugins = [injectNormalize(opts), kolachePlugin(opts), precss(opts)];

  return function (root, result) {
    return plugins.reduce((promise, plugin) => {
      return promise.then(() => {
        return plugin(result.root, result);
      });
    }, Promise.resolve());
  };
});

module.exports = index;
