import path from 'node:path';
import type { Rule } from 'eslint';
import type { Node, Identifier, MemberExpression } from 'estree';

const testModules = [
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
];

const testFunctions = new Set([
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
]);

function stringValue(node: Node): string | undefined {
  if (node.type === 'Literal' && typeof node.value === 'string') {
    return node.value;
  }
  if (node.type === 'TemplateLiteral' && node.expressions.length === 0) {
    return node.quasis[0]?.value.cooked ?? undefined;
  }
  return undefined;
}

function propertyName(node: MemberExpression): string | undefined {
  if (!node.computed && node.property.type === 'Identifier') {
    return node.property.name;
  }
  return stringValue(node.property);
}

function isTestModule(source: string): boolean {
  return testModules.some(
    (name) => source === name || source.startsWith(`${name}/`),
  );
}

const noTests: Rule.RuleModule = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow test files, test framework imports, and test declarations.',
      url: 'https://github.com/Hiroshiba/eslint-plugin-no-tests#検出対象',
    },
    schema: [],
    messages: {
      file: 'Test files are not allowed ({{filename}}).',
      module: 'Test framework imports are not allowed ({{source}}).',
      call: 'Test declarations are not allowed ({{name}}).',
    },
  },
  create(context) {
    const sourceCode = context.sourceCode;
    const filename = path
      .relative(context.cwd, context.physicalFilename)
      .split(path.sep)
      .join('/');
    const isTestFile =
      /(?:^|\/)(?:__tests__|tests?)\//u.test(filename) ||
      /(?:^|\/)(?:[^/]+\.)?(?:test|spec)\.[cm]?[jt]sx?$/u.test(filename);

    function isGlobal(identifier: Identifier): boolean {
      for (
        let scope = sourceCode.getScope(identifier);
        scope;
        scope = scope.upper!
      ) {
        const reference = scope.references.find(
          (candidate) => candidate.identifier === identifier,
        );
        if (reference) {
          return !reference.resolved || reference.resolved.defs.length === 0;
        }
      }
      return false;
    }

    function checkModule(node: Node) {
      const source = stringValue(node);
      if (source && isTestModule(source)) {
        context.report({ node, messageId: 'module', data: { source } });
      }
    }

    function checkCall(callee: Node) {
      let root = callee;
      const members: (string | undefined)[] = [];
      while (root.type === 'MemberExpression') {
        members.unshift(propertyName(root));
        root = root.object;
      }
      if (root.type !== 'Identifier' || !isGlobal(root)) {
        return;
      }

      const isDirectTest = testFunctions.has(root.name);
      const isGlobalTest =
        ['globalThis', 'global', 'window', 'self'].includes(root.name) &&
        members[0] !== undefined &&
        testFunctions.has(members[0]);
      const isDenoTest = root.name === 'Deno' && members[0] === 'test';
      const isQUnitTest =
        root.name === 'QUnit' &&
        ['test', 'todo', 'skip', 'only', 'module'].includes(members[0] ?? '');
      if (isDirectTest || isGlobalTest || isDenoTest || isQUnitTest) {
        context.report({
          node: callee,
          messageId: 'call',
          data: { name: sourceCode.getText(callee) },
        });
      }
    }

    if (isTestFile) {
      return {
        Program(node) {
          context.report({
            node,
            loc: { line: 1, column: 0 },
            messageId: 'file',
            data: { filename },
          });
        },
      };
    }

    return {
      ImportDeclaration(node) {
        checkModule(node.source);
      },
      ExportNamedDeclaration(node) {
        if (node.source) checkModule(node.source);
      },
      ExportAllDeclaration(node) {
        checkModule(node.source);
      },
      ImportExpression(node) {
        checkModule(node.source);
      },
      CallExpression(node) {
        if (
          node.callee.type === 'Identifier' &&
          node.callee.name === 'require' &&
          isGlobal(node.callee) &&
          node.arguments[0]
        ) {
          checkModule(node.arguments[0]);
        }
        checkCall(node.callee);
      },
      TaggedTemplateExpression(node) {
        checkCall(node.tag);
      },
      // TypeScript's `import x = require('...')` uses a distinct AST node.
      'TSExternalModuleReference > Literal'(node: Node) {
        checkModule(node);
      },
    };
  },
};

export default noTests;
