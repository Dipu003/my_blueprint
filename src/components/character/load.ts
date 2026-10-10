import type { Stage } from './stage';

let loading: Promise<Stage | null> | null = null;

/**
 * Loads three.js, builds the shared stage, puts the hero on it and pre-compiles its shaders, once. The
 * library is a separate chunk, so the rest of the site never waits for it. Resolves null when WebGL is not
 * available (the site then simply goes on without the character).
 */
export function loadStage(): Promise<Stage | null> {
  if (!loading) {
    loading = import('./stage')
      .then(async (m) => {
        const stage = m.getStage();
        // The hero public/models/hero.json describes (the one made from his picture); if it describes none,
        // or he cannot be loaded, the code-built knight takes his place.
        if (!(await stage.useModel('/models/hero.json'))) await stage.useBuiltIn();
        await stage.warm();
        return stage;
      })
      .catch(() => null);
  }
  return loading;
}
