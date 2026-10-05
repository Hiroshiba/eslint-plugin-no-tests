# eslint-plugin-no-tests

テストを書かない方針のプロジェクトで、テストコードの追加をESLintのエラーとして検出するプラグインです。

Node.js 22.13 以上の 22 系、または 24 以上 / ESLint 9.10 以降の 9 系・10 系に対応します。ESM・Flat Config 専用です。

## 導入

[GitHub Releases](https://github.com/Hiroshiba/eslint-plugin-no-tests/releases) の `.tgz` をインストールします。以下は v0.1.0 の例です。

```sh
pnpm add -D eslint https://github.com/Hiroshiba/eslint-plugin-no-tests/releases/download/v0.1.0/eslint-plugin-no-tests-0.1.0.tgz
```

`eslint.config.mjs` に設定を追加します。ESM の `eslint.config.js` を使っている場合は、そのファイルに追加できます。

```js
import noTests from 'eslint-plugin-no-tests';

export default [
  // 既存の設定
  noTests.configs.recommended,
];
```

```sh
pnpm exec eslint .
```

`recommended` は `no-tests/no-tests` を `error` で有効にします。
検査するファイルを ESLint の対象に含め、テスト用ファイルを ignore しないでください。TypeScript / JSX には対応するパーサーの設定も必要です。

## 検出対象

- `tests/` や `__tests__/` 以下のファイル、`*.test.js` や `*.spec.ts` などのテスト用ファイル
- `vitest`、`@jest/globals`、`node:test` などのテストフレームワークの読み込み
- グローバルの `test()`、`describe()`、`it()` などのテスト宣言

独自のテスト用ラッパーや命名規則、変数で組み立てたモジュール名などは検出できないことがあります。

## 開発

```sh
pnpm install --frozen-lockfile
pnpm check
pnpm pack
```

`pnpm check` はビルド、型チェック、このプラグイン自体のテスト、ESLint、Prettier を実行します。
テストを実行する場合は `pnpm test`、配布用の `.tgz` を作成する場合は `pnpm pack` を使います。

## CI とリリース

`main` への push と pull request で、Node.js 22 / 24 のチェックとパッケージ作成を実行します。

GitHub の Actions → Release → Run workflow で `main` を選び、`version` に `1.2.3` のような安定版のバージョンを入力すると、GitHub Release と `.tgz` が作成されます。`v` は付けず、まだ使っていないバージョンを指定してください。
npm レジストリや GitHub Packages には公開しません。
