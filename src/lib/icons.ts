// Phosphor icons (@phosphor-icons/core, MIT), read from the package and
// inlined into the HTML at build time: no icon font, no runtime JS.
// One family for the whole site; `regular` for UI, `fill` only for state
// (the sound that is playing).
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

export type IconWeight = 'regular' | 'fill';

const require = createRequire(import.meta.url);
const cache = new Map<string, string>();

export function iconSvg(name: string, weight: IconWeight = 'regular'): string {
  const key = `${weight}/${name}`;
  let svg = cache.get(key);
  if (!svg) {
    // the package suffixes non-regular files: fill/heart-fill.svg
    const file = weight === 'regular' ? name : `${name}-${weight}`;
    svg = readFileSync(require.resolve(`@phosphor-icons/core/${weight}/${file}.svg`), 'utf8');
    cache.set(key, svg);
  }
  return svg;
}
