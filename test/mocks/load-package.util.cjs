/**
 * CommonJS shim for `@nestjs/common/utils/load-package.util.js`.
 *
 * The real ESM-only source uses `import.meta.url`, which TypeScript cannot
 * downlevel to CommonJS, so ts-jest cannot transform it. Unit tests never
 * load Nest's optional peer dependencies through it, so a `require`-based
 * stand-in is enough and keeps the suite runnable.
 */
const packageCache = new Map();

function loadPackageSync(packageName, context, loaderFn) {
  const cached = packageCache.get(packageName);
  if (cached) return cached;
  try {
    const pkg = loaderFn ? loaderFn() : require(packageName);
    packageCache.set(packageName, pkg);
    return pkg;
  } catch {
    const error = new Error(
      `The "${packageName}" package is missing. Please make sure to install it to use ${context}.`,
    );
    error.code = 'MODULE_NOT_FOUND';
    throw error;
  }
}

async function loadPackage(packageName, context, loaderFn) {
  const cached = packageCache.get(packageName);
  if (cached) return cached;
  try {
    const pkg = loaderFn ? await loaderFn() : await import(packageName);
    packageCache.set(packageName, pkg);
    return pkg;
  } catch {
    const error = new Error(
      `The "${packageName}" package is missing. Please make sure to install it to use ${context}.`,
    );
    error.code = 'MODULE_NOT_FOUND';
    throw error;
  }
}

function loadPackageCached(packageName, context) {
  if (!packageCache.has(packageName)) loadPackageSync(packageName, context);
  return packageCache.get(packageName);
}

async function tryLoadPackage(packageName, loaderFn) {
  const cached = packageCache.get(packageName);
  if (cached) return cached;
  try {
    const pkg = loaderFn ? await loaderFn() : await import(packageName);
    packageCache.set(packageName, pkg);
    return pkg;
  } catch {
    return null;
  }
}

module.exports = {
  loadPackage,
  loadPackageSync,
  loadPackageCached,
  tryLoadPackage,
};
