// TypeScript 6.0 (TS2882) requires an explicit module declaration for the
// side-effect CSS import in app/_layout.tsx. NativeWind's type shims augment
// React Native props but do not declare `*.css` modules themselves.
declare module '*.css';
