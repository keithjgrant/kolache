import postcss from "postcss";
import precss from "precss";
import injectNormalize from "./injectNormalize";
import kolachePlugin from "./plugin";

const DEFAULT_OPTIONS = {
  includeNormalize: true,
  importPaths: ["node_modules"],
};

export default postcss.plugin("kolache", opts => {
  opts = Object.assign({}, DEFAULT_OPTIONS, opts);

  const plugins = [
    injectNormalize(opts),
    kolachePlugin(opts), precss(opts),
  ];

  return (root, result) =>
    plugins.reduce(
      (promise, plugin) => promise.then(() => plugin(result.root, result)),
      Promise.resolve()
    );
});
