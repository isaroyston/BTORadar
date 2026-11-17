import { registerHooks } from "node:module";

registerHooks({
  resolve(specifier, context, nextResolve) {
    const isExtensionlessRelativeImport =
      (specifier.startsWith("./") || specifier.startsWith("../")) &&
      !/\.[^/]+$/.test(specifier);

    return nextResolve(
      isExtensionlessRelativeImport ? `${specifier}.ts` : specifier,
      context
    );
  },
});
