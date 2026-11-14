/** The version of package.json, put in by the build (vite.config.ts, `define`). */
declare const __APP_VERSION__: string;

// A stylesheet imported as text (Vite `?inline`): compiled SCSS as one string.
declare module '*.scss?inline' {
  const css: string;
  export default css;
}
