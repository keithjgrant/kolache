export default function manageUnresolved(node, opts, word, message) {
  if (opts.unresolved === 'warn') {
    node.warn(opts.result, message, { word });
  } else if (opts.unresolved !== 'ignore') {
    throw node.error(message, { word });
  }
}
