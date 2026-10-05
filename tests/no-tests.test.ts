import path from 'node:path';
import { describe, it } from 'node:test';
import { RuleTester } from 'eslint';
import tseslint from 'typescript-eslint';
import plugin from 'eslint-plugin-no-tests';

// RuleTester performs the lint assertions; node:test discovers and reports cases.
RuleTester.describe = describe;
RuleTester.it = it;

const rule = plugin.rules['no-tests'];
const tester = new RuleTester();

function moduleCase(code: string, source: string): RuleTester.InvalidTestCase {
  return {
    code,
    errors: [{ messageId: 'module', data: { source } }],
    output: null,
  };
}

function callCase(code: string, name: string): RuleTester.InvalidTestCase {
  return {
    code,
    errors: [{ messageId: 'call', data: { name } }],
    output: null,
  };
}

tester.run('no-tests: filenames', rule, {
  valid: [
    'export const value = 1;',
    ...[
      'src/example.js',
      'src/contest/example.ts',
      'src/tests-utils/example.ts',
      'src/__tests__-helpers/example.js',
      'src/test-helper.js',
      'src/unit.spec.integration.ts',
      'src/test.specification.js',
      'src/specs/example.ts',
      'e2e/example.js',
      'TESTS/example.js',
      'src/example.TEST.js',
      'src/example.test.json',
      'src/example.spec.ts.bak',
    ].map((filename) => ({
      name: `allows ${filename}`,
      code: '',
      filename: path.resolve(filename),
    })),
  ],
  invalid: [
    ...[
      'test/example.js',
      'tests/example.js',
      '__tests__/example.js',
      'src/test/example.js',
      'src/tests/nested/example.js',
      'src/__tests__/example.js',
      ...[
        'js',
        'jsx',
        'mjs',
        'mjsx',
        'cjs',
        'cjsx',
        'ts',
        'tsx',
        'mts',
        'mtsx',
        'cts',
        'ctsx',
      ].flatMap((extension) => [
        `src/example.test.${extension}`,
        `src/example.spec.${extension}`,
        `test.${extension}`,
        `spec.${extension}`,
      ]),
    ].map((filename) => ({
      name: `rejects empty ${filename}`,
      code: '',
      filename: path.resolve(filename),
      errors: [{ messageId: 'file', data: { filename }, line: 1, column: 1 }],
      output: null,
    })),
    {
      name: 'reports only the filename even when the file also contains tests',
      code: '\nimport { test } from "vitest";\ntest("example", () => {});',
      filename: path.resolve('src/example.test.js'),
      errors: [
        {
          messageId: 'file',
          data: { filename: 'src/example.test.js' },
          line: 1,
          column: 1,
        },
      ],
      output: null,
    },
  ],
});

tester.run('no-tests: framework modules', rule, {
  valid: [
    'import value from "ordinary-package";',
    'import value from "./vitest";',
    'import value from "vitest-extra";',
    'import value from "@jest/globals-extra";',
    'import value from "playwright";',
    'import value from "node:assert";',
    'export { value } from "ordinary-package";',
    'export * from "ordinary-package";',
    'import(moduleName);',
    'import(`vitest/${moduleName}`);',
    'require(moduleName);',
    'require(`vitest/${moduleName}`);',
    'require("vit" + "est");',
    'require();',
    'require(123);',
    'loader.require("vitest");',
    'function load(require) { return require("vitest"); }',
    'const require = () => {}; require("vitest");',
    'import require from "./loader.js"; require("vitest");',
  ],
  invalid: [
    ...[
      'vitest',
      '@jest/globals',
      'jest',
      'mocha',
      'jasmine',
      'jasmine-core',
      'ava',
      'tape',
      'tap',
      'node:test',
      'bun:test',
      '@playwright/test',
      'playwright/test',
      'cypress',
      'qunit',
    ].flatMap((source) => [
      moduleCase(`import "${source}";`, source),
      moduleCase(`import "${source}/helpers";`, `${source}/helpers`),
    ]),
    moduleCase('import { test as check } from "vitest";', 'vitest'),
    moduleCase('import * as framework from "vitest";', 'vitest'),
    moduleCase('import framework from "vitest";', 'vitest'),
    moduleCase('export { test } from "vitest";', 'vitest'),
    moduleCase('export * from "vitest";', 'vitest'),
    moduleCase('export * as framework from "vitest";', 'vitest'),
    moduleCase('import("vitest");', 'vitest'),
    moduleCase('import(`vitest`);', 'vitest'),
    moduleCase('require("vitest");', 'vitest'),
    moduleCase('require(`vitest`);', 'vitest'),
    {
      ...moduleCase('const framework = require("node:test");', 'node:test'),
      languageOptions: { sourceType: 'commonjs' },
    },
    {
      ...moduleCase('require("mocha");', 'mocha'),
      languageOptions: { globals: { require: 'readonly' } },
    },
    {
      ...moduleCase('\nimport "vitest";', 'vitest'),
      errors: [
        {
          messageId: 'module',
          data: { source: 'vitest' },
          line: 2,
          column: 8,
          endLine: 2,
          endColumn: 16,
        },
      ],
    },
    {
      code: 'import "vitest"; export * from "mocha";',
      errors: [
        { messageId: 'module', data: { source: 'vitest' } },
        { messageId: 'module', data: { source: 'mocha' } },
      ],
      output: null,
    },
  ],
});

tester.run('no-tests: declarations and scope', rule, {
  valid: [
    '/example/.test("example");',
    'const object = { test() {} }; object.test();',
    'object.test();',
    'const test = () => {}; test();',
    'function test() {} test();',
    'function run(test) { test(); }',
    'function run({ test }) { test.only(); }',
    'function run(test) { return () => test.skip(); }',
    '{ const describe = () => {}; describe(); }',
    'import { test } from "./production.js"; test();',
    'import { matcher as it } from "./production.js"; it();',
    'const globalThis = { test() {} }; globalThis.test();',
    'function run(window) { window.test(); }',
    'function run(Deno) { Deno.test(); }',
    'function run(QUnit) { QUnit.test(); }',
    'globalThis[method]();',
    'globalThis[`test${suffix}`]();',
    'globalThis[123]();',
    'globalThis.Math.test();',
    'Deno.bench();',
    'QUnit.start();',
    `const source = 'test("example", () => {})';`,
    '// test("example", () => {});',
    // Known limits: aliases and returned functions are not tracked.
    'const check = test; check();',
    'getFramework().test();',
  ],
  invalid: [
    ...[
      'describe',
      'it',
      'test',
      'suite',
      'context',
      'specify',
      'fdescribe',
      'xdescribe',
      'fit',
      'xit',
      'xtest',
      'xcontext',
      'xspecify',
    ].map((name) => callCase(`${name}("example", () => {});`, name)),
    ...[
      'test.only',
      'test.skip',
      'test.concurrent.only',
      'test["only"]',
      'test[`skip`]',
      'test[modifier]',
      'globalThis.test',
      'global.test',
      'window.describe',
      'self.it',
      'globalThis["test"]',
      'globalThis[`test`].only',
      'Deno.test',
      'Deno["test"]',
      'QUnit.test',
      'QUnit.todo',
      'QUnit.skip',
      'QUnit.only',
      'QUnit.module',
    ].map((name) => callCase(`${name}("example", () => {});`, name)),
    callCase('test.each([[1]])("example", () => {});', 'test.each'),
    callCase('test.each`value\n${1}`("example", () => {});', 'test.each'),
    callCase('describe`example`;', 'describe'),
    callCase('test?.("example", () => {});', 'test'),
    callCase('globalThis?.test("example", () => {});', 'globalThis?.test'),
    callCase('function run() { test("example", () => {}); }', 'test'),
    callCase('function run(test) { test(); } test();', 'test'),
    callCase('{ const test = () => {}; test(); } test();', 'test'),
    {
      ...callCase('test("example", () => {});', 'test'),
      languageOptions: { globals: { test: 'readonly' } },
    },
    {
      ...callCase('describe("example", () => {});', 'describe'),
      languageOptions: { globals: { describe: 'writable' } },
    },
    {
      ...callCase(
        'const test = () => {}; test(); globalThis.test();',
        'globalThis.test',
      ),
      name: 'a local test does not hide an explicit globalThis.test',
    },
    {
      ...callCase('\n  test.only("example", () => {});', 'test.only'),
      errors: [
        {
          messageId: 'call',
          data: { name: 'test.only' },
          line: 2,
          column: 3,
          endLine: 2,
          endColumn: 12,
        },
      ],
    },
    {
      code: 'describe("suite", () => { it("case", () => {}); });',
      errors: [
        { messageId: 'call', data: { name: 'describe' } },
        { messageId: 'call', data: { name: 'it' } },
      ],
      output: null,
    },
  ],
});

const typescriptTester = new RuleTester({
  languageOptions: { parser: tseslint.parser },
});

typescriptTester.run('no-tests: TypeScript syntax and references', rule, {
  valid: [
    {
      code: 'const value: string = "example";',
      filename: path.resolve('src/example.ts'),
    },
    'function run(test: () => void) { test(); }',
    'const test: () => void = () => {}; test();',
    'import { test } from "./production"; test<string>();',
    'import framework = require("./production"); framework.test();',
    'import type { Value } from "./production";',
    // Type references with familiar names must not crash or become declarations.
    'type test = string; const value: test = "example";',
    'type Value = typeof test;',
    'interface describe { value: string }',
    // Documented limit: TypeScript assertion wrappers are not unwrapped.
    '(test as () => void)();',
    'test!();',
  ],
  invalid: [
    moduleCase('import type { TestContext } from "node:test";', 'node:test'),
    moduleCase('import { type TestContext } from "node:test";', 'node:test'),
    moduleCase('export type { TestContext } from "node:test";', 'node:test'),
    moduleCase('export type * from "node:test";', 'node:test'),
    moduleCase('import framework = require("vitest");', 'vitest'),
    moduleCase('import type framework = require("vitest");', 'vitest'),
    callCase('test<string>("example", () => {});', 'test'),
    callCase('type test = string; test("example", () => {});', 'test'),
    callCase('interface test {} test("example", () => {});', 'test'),
    callCase('function run<T>() { test("example", () => {}); }', 'test'),
    {
      ...callCase('const view = <div />; test("example", () => {});', 'test'),
      filename: path.resolve('src/example.tsx'),
    },
  ],
});
