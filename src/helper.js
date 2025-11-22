export function checkHeading(str) {
  return str.includes('**');
}

export function replaceHeading(str) {
  return str.replace(/\*+/g, '');
}