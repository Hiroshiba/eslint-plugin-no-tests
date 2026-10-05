import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { describe, it } from 'node:test';
import { ESLint, Linter } from 'eslint';
import tseslint from 'typescript-eslint';
import plugin from 'eslint-plugin-no-tests';

const ruleId = 'no-tests/no-tests';
const recommended = plugin.configs.recommended;

// Importing by package name exercises the public exports and built declarations.
describe('built package and flat config', () => {
  it('exports metadata matching the packaged version, including release overrides', async () => {
    const manifest = JSON.parse(
      await readFile(new URL('../package.json', import.meta.url), 'utf8'),
    );
    assert.deepEqual(plugin.meta, {
      name: manifest.name,
      version: manifest.version,
    });
    assert.deepEqual(Object.keys(plugin.rules), ['no-tests']);
    assert.equal(recommended.plugins?.['no-tests'], plugin);
    assert.equal(recommended.rules?.[ruleId], 'error');
    assert.equal(plugin.rules['no-tests'].meta?.fixable, undefined);
  });

  it('enables the rule at error severity through the recommended config', () => {
    const messages = new Linter().verify(
      'test("example", () => {});',
      recommended,
    );
    assert.equal(messages.length, 1);
    assert.equal(messages[0]?.ruleId, ruleId);
    assert.equal(messages[0]?.messageId, 'call');
    assert.equal(messages[0]?.severity, 2);
  });

  it('supports manual registration under a different plugin name', () => {
    const messages = new Linter().verify('import "vitest";', {
      plugins: { policy: plugin },
      rules: { 'policy/no-tests': 'error' },
    });
    assert.equal(messages.length, 1);
    assert.equal(messages[0]?.ruleId, 'policy/no-tests');
    assert.equal(messages[0]?.messageId, 'module');
  });

  it('composes with the documented TypeScript flat config', async () => {
    const eslint = new ESLint({
      overrideConfigFile: true,
      overrideConfig: [...tseslint.configs.recommended, recommended],
    });
    const [result] = await eslint.lintText('export const value: number = 1;', {
      filePath: 'src/example.ts',
    });
    assert.deepEqual(result?.messages, []);
    const [testResult] = await eslint.lintText('', {
      filePath: 'src/example.test.ts',
    });
    assert.equal(testResult?.messages.length, 1);
    assert.equal(testResult?.messages[0]?.messageId, 'file');
  });

  it('does not automatically fix or remove tests', () => {
    const code = 'test("example", () => {});';
    const result = new Linter().verifyAndFix(code, recommended);
    assert.equal(result.fixed, false);
    assert.equal(result.output, code);
    assert.equal(result.messages.length, 1);
    assert.equal(result.messages[0]?.messageId, 'call');
  });

  it('rejects unsupported rule options', () => {
    assert.throws(() =>
      new Linter().verify('', {
        plugins: { 'no-tests': plugin },
        rules: { [ruleId]: ['error', { allowTests: true }] },
      }),
    );
  });

  it('uses paths relative to cwd, not a test-named parent directory', async () => {
    const cwd = path.resolve('tests/fixtures/project');
    const eslint = new ESLint({
      cwd,
      overrideConfigFile: true,
      overrideConfig: [recommended],
    });
    const [source] = await eslint.lintText('', {
      filePath: path.join(cwd, 'src/example.js'),
    });
    assert.deepEqual(source?.messages, []);
    const [test] = await eslint.lintText('', {
      filePath: path.join(cwd, 'tests/example.js'),
    });
    assert.equal(test?.messages.length, 1);
    assert.equal(
      test?.messages[0]?.message,
      'Test files are not allowed (tests/example.js).',
    );
  });

  it('respects consumer ignores without introducing its own test exemptions', async () => {
    const eslint = new ESLint({
      overrideConfigFile: true,
      overrideConfig: [{ ignores: ['generated/**'] }, recommended],
    });
    assert.deepEqual(
      await eslint.lintText('', {
        filePath: 'generated/example.test.js',
        warnIgnored: false,
      }),
      [],
    );
    const [result] = await eslint.lintText('', {
      filePath: 'tests/example.js',
    });
    assert.equal(result?.messages.length, 1);
    assert.equal(result?.messages[0]?.messageId, 'file');
  });
});

describe('repository dogfooding', () => {
  it('exempts only this repository’s tests while continuing to lint them', async () => {
    const eslint = new ESLint();
    const [test] = await eslint.lintText('import "node:test"; missingName();', {
      filePath: 'tests/example.test.js',
    });
    assert.deepEqual(
      test?.messages.map((message) => message.ruleId),
      ['no-undef'],
    );
    const [source] = await eslint.lintText('import "node:test";', {
      filePath: 'src/example.js',
    });
    assert.deepEqual(
      source?.messages.map((message) => message.ruleId),
      [ruleId],
    );
    const [outside] = await eslint.lintText('', {
      filePath: 'src/example.test.js',
    });
    assert.equal(outside?.messages[0]?.messageId, 'file');
  });
});
