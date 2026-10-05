import type { Config } from 'jest';
import { pathsToModuleNameMapper } from 'ts-jest';
import ts from 'typescript';

// Path aliases (e.g. the ones added by `nest g library`) live in tsconfig.json,
// so they are read from there instead of being duplicated here.
const { config: tsconfig } = ts.readConfigFile(
  './tsconfig.json',
  ts.sys.readFile,
);
const paths = tsconfig?.compilerOptions?.paths ?? {};

const config: Config = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': [
      'ts-jest',
      {
        tsconfig: {
          rootDir: '.',
          isolatedModules: true,
          // The root tsconfig targets `nodenext`, which makes ts-jest emit ESM for
          // ESM-only packages (@nestjs/* v12). Jest runs this suite as CommonJS,
          // so pin the transform output to CommonJS regardless of package type.
          module: 'commonjs',
          moduleResolution: 'node10',
          resolvePackageJsonExports: false,
          ignoreDeprecations: '6.0',
          // Without this ts-jest passes .js through untouched, so the ESM-only
          // @nestjs/* sources would reach Jest untransformed.
          allowJs: true,
        },
      },
    ],
  },
  moduleNameMapper: {
    // Uses `import.meta.url`, which TypeScript cannot downlevel to CommonJS.
    // Nest imports it by relative path, so match on the path suffix.
    '.*[\\\\/]utils[\\\\/]load-package\\.util\\.js$':
      '<rootDir>/test/mocks/load-package.util.cjs',
    ...pathsToModuleNameMapper(paths, { prefix: '<rootDir>/' }),
  },
  // @nestjs/* v12 and uuid ship as ESM-only. ts-jest has to transpile them to
  // CommonJS because the test files and the rest of the suite are CommonJS.
  transformIgnorePatterns: ['/node_modules/(?!@nestjs/|uuid)'],
  collectCoverageFrom: [
    'src/**/*.(t|j)s',
    'libs/**/*.(t|j)s',
    'apps/**/*.(t|j)s',
  ],
  coverageDirectory: './coverage',
  testEnvironment: 'node',
};

export default config;
