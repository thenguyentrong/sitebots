import type { Lang } from './config';

/**
 * One block of interface text in both languages, side by side so a reviewer reads the English and the
 * German of a sentence together. The German must have exactly the English shape (same keys, same
 * function signatures), which TypeScript checks here: a missing or extra German string fails the build.
 * Client components import only the blocks they show, so a page ships only its own words.
 */
export function bilingual<T>(text: { en: T; de: NoInfer<T> }): Record<Lang, T> {
  return text;
}
