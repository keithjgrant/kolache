export function parseParams(params) {
  const parts = params.split('as');
  if (parts.length !== 2) {
    throw new Error(`Invalid @cpm-import: ${params}`);
  }
  return {
    filename: parts[0].trim(),
    name: parts[1].trim(),
  };
}

export default function parseRule(atRule) {}
