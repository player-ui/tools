import ts from "typescript";

export const DEFAULT_COMPILER_OPTIONS: ts.CompilerOptions = {
  strict: true,
  target: ts.ScriptTarget.ES2016,
  allowJs: false,
  jsx: ts.JsxEmit.ReactJSX,
  moduleResolution: ts.ModuleResolutionKind.NodeJs,
  allowSyntheticDefaultImports: true,
  module: ts.ModuleKind.ES2015,
  skipLibCheck: true,
};
