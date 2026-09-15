let seq = 0;

export function nextId(prefix = 'm'): string {
  seq += 1;
  return `${prefix}${Date.now().toString(36)}${seq}`;
}
