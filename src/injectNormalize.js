import postcss from 'postcss';

export default postcss.plugin('postcss-inject-normalize', opts => {
  return root => {
    if (!opts.includeNormalize) {
      return;
    }
    const first = root.nodes[0];
    if (first && first.type === 'atrule' && first.name === 'charset') {
      root.insertAfter(first, {
        type: 'atrule',
        name: 'import',
        params: '"normalize.css/normalize.css"',
      });
    } else {
      console.log('prepending...');
      root.prepend({
        type: 'atrule',
        name: 'import',
        params: '"normalize.css/normalize.css"',
      });
    }
  };
});
