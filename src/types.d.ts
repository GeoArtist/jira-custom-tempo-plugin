// A stylesheet imported as text (Vite `?inline`): compiled SCSS as one string.
declare module '*.scss?inline' {
  const css: string;
  export default css;
}
