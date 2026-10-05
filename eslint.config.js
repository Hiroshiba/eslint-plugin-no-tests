import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import noTests from './dist/index.js';

export default [
  { ignores: ['dist/**', 'node_modules/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  noTests.configs.recommended,
  // This plugin needs regression tests; consumer projects still forbid tests.
  { files: ['tests/**'], rules: { 'no-tests/no-tests': 'off' } },
];
