import postcss from 'postcss';

export default postcss.plugin('postcss-cpm', opts => {

  const packages = [];

  return function (root, result) {
    root.walkAtRules('cpm-package', rule => {
      packages.push(rule);
    });

    root.walkAtRules('cpm-import', rule => {

    });
  };

});
