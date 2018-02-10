import postcss from 'postcss';

export default postcss.plugin('postcss-cpm', opts => {
  const packages = {};

  return function (root, result) {
    root.walkAtRules('cpm-package', rule => {
      console.log('cpm-package', rule);
    });

    root.walkAtRules('cpm-import', rule => {});
  };
});
