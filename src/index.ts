import type { Linter, Rule } from 'eslint';
import { name, version } from '../package.json';
import noTests from './rules/no-tests.js';

const recommended: Linter.Config = {
  name: 'no-tests/recommended',
  rules: { 'no-tests/no-tests': 'error' },
};

const plugin: {
  meta: { name: string; version: string };
  rules: { 'no-tests': Rule.RuleModule };
  configs: { recommended: Linter.Config };
} = {
  meta: { name, version },
  rules: { 'no-tests': noTests },
  configs: { recommended },
};

recommended.plugins = { 'no-tests': plugin };

export default plugin;
