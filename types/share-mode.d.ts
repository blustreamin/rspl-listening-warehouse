/** Compile-time share-mode flag injected by vite.config.ts `define` from
 *  VITE_SHARE_MODE. True only in a share build; the dead branch in index.tsx
 *  is eliminated at build time. */
declare const __SHARE_MODE__: boolean;
