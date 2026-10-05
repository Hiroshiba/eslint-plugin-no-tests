# eslint-plugin-no-tests

「このプロジェクトではテストを書かない」を ESLint で検査するプラグインです。
テスト用ファイル、テストフレームワークの読み込み、テスト宣言をエラーにします。

Node.js 22.13 以上の 22 系、または 24 以上 / ESLint 9.10 以降の 9 系・10 系 / Flat Config に対応します。ESM 専用です。

## 導入

npm レジストリや GitHub Packages には公開しません。
[GitHub Releases](https://github.com/Hiroshiba/eslint-plugin-no-tests/releases) の `.tgz` を使います。
以下の `0.1.0` は、実際に公開されているリリースのバージョンに置き換えてください。
初回リリース前は、後述のソースからのビルド手順を使えます。

```sh
pnpm add -D eslint https://github.com/Hiroshiba/eslint-plugin-no-tests/releases/download/v0.1.0/eslint-plugin-no-tests-0.1.0.tgz
```

`eslint.config.mjs` に設定を追加します。既存の `eslint.config.js` が ESM として扱われるプロジェクト（`package.json` に `"type": "module"` がある場合など）では、そのファイルに追加できます。

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
既存の対象ファイル・パーサー・ignore 設定はそのまま使います。
TypeScript / JSX も検査する場合は、それらのファイルを ESLint の対象にして、対応するパーサーを設定してください。
たとえば TypeScript の場合は次のように設定できます。

```sh
pnpm add -D typescript@5 typescript-eslint@8
```

```js
import tseslint from 'typescript-eslint';
import noTests from 'eslint-plugin-no-tests';

export default [...tseslint.configs.recommended, noTests.configs.recommended];
```

ルールを個別に有効にすることもできます。ルール固有のオプションはありません。

```js
import noTests from 'eslint-plugin-no-tests';

export default [
  {
    plugins: { 'no-tests': noTests },
    rules: { 'no-tests/no-tests': 'error' },
  },
];
```

## 検出対象

- ESLint の作業ディレクトリからの相対パスに `test/`、`tests/`、`__tests__/` を含むファイル。空のファイルも対象です
- `*.test.js`、`*.spec.ts`、`test.js`、`spec.ts` などの名前。拡張子は `js`、`jsx`、`mjs`、`cjs`、`ts`、`tsx`、`mts`、`cts` と、それらの JSX 形式を対象にします
- 以下のモジュールとそのサブパスの読み込み・再エクスポート
  - `vitest`、`@jest/globals`、`jest`、`mocha`、`jasmine`、`jasmine-core`
  - `ava`、`tape`、`tap`、`node:test`、`bun:test`
  - `@playwright/test`、`playwright/test`、`cypress`、`qunit`
- グローバルの `describe`、`it`、`test`、`suite`、`context`、`specify`、`fdescribe`、`xdescribe`、`fit`、`xit`、`xtest`、`xcontext`、`xspecify` の呼び出し
- それらの `.only`、`.skip`、`.each` などのプロパティ呼び出しやタグ付きテンプレート
- `globalThis.test` など、`globalThis`、`global`、`window`、`self` 経由の上記グローバル API
- `Deno.test` と `QUnit.test` / `todo` / `skip` / `only` / `module`

モジュールの検出は、静的 `import`、`export ... from`、`import('...')`、`require('...')`、TypeScript の `import x = require('...')` に対応します。
動的 `import` と `require` は文字列リテラル、または式を含まないテンプレートリテラルを検査します。
型だけの静的 import も対象です。

ローカル変数・関数・引数・import として定義された同名の `test` などは、グローバル API として扱いません。
正規表現の `.test()`、通常のオブジェクトの `.test()`、コメントや文字列内のテストコードも検出しません。
テスト用ファイルでは、ファイル名に対するエラーを 1 件だけ出します。自動修正は行いません。

## 制約

これは一般的なテストの書き方を検出する静的なルールです。任意のプログラムからテストの意図を完全に判定するものではありません。

- ESLint が ignore しているファイル、対象外の拡張子、構文解析できないファイルはこのルールで検査できません。テスト用パスを ignore しないでください
- 独自のテスト用ラッパー、別名への代入、変数で組み立てたモジュール名、未対応フレームワーク、独自のファイル命名規則は検出できないことがあります
- `src/unit.spec.integration.ts`、`specs/`、`e2e/` は名前だけでは検出しません。上記の import や API 呼び出しがあれば検出します
- パスの判定は大文字と小文字を区別します。作業ディレクトリ自体や、その親の名前は判定に使いません
- フレームワークの設定ファイルなど、テスト本体以外でも対象モジュールを読み込めばエラーになります
- 本番コードで同名のグローバル API を使っている場合は誤検出し得ます。その場合は必要なファイルに限定してルールを無効化してください
- TypeScript の型アサーションなどで呼び出し元を包んだ式や、別のオブジェクトへ移した API は追跡しません

## 開発

pnpm のバージョンは `package.json` の `packageManager` に固定しています。
このリポジトリにもテストコード・テストランナーは置きません。
Vite のライブラリモードで JavaScript を、TypeScript で型定義を生成します。
生成したプラグインを自身の ESLint 設定にも適用しています。

```sh
pnpm install --frozen-lockfile
pnpm check
pnpm pack
```

`pnpm check` は型チェック、ビルド、ESLint、Prettier を実行します。
`pnpm lint` 単独の実行前には `pnpm build` が必要です。
`pnpm pack` はビルド済みの JavaScript・型定義と README を含む `.tgz` を作成します。
ソースから使う場合は、このリポジトリを clone して上記を実行し、利用先で生成物をインストールします。

```sh
pnpm add -D /path/to/eslint-plugin-no-tests/eslint-plugin-no-tests-0.1.0.tgz
```

## CI とリリース

push と pull request で、Node.js 22 / 24 の型チェック・ビルド・ESLint・Prettier・パッケージ作成を実行します。

GitHub の Actions → Release → Run workflow で `main` を選び、`version` に `1.2.3` のような安定版の SemVer を入力すると、次を行います。

1. 入力と既存タグを検査
2. 固定 lockfile から依存関係をインストール
3. 作業コピーのパッケージバージョンを更新して全チェック・ビルド
4. 実行対象のコミットに `v1.2.3` タグを作成し、GitHub Release に `.tgz` を添付

`v` 接頭辞、プレリリース、ビルドメタデータは入力できません。既存タグは上書きしません。
リポジトリへのバージョン更新コミットは作成しません。タグのソースは実行対象コミットのままで、配布物とプラグインのメタデータに入力バージョンを反映します。
通常の push でリリースは作成されません。
`private: true` でレジストリ公開を防ぎ、ワークフローにも npm / GitHub Packages への publish は含めません。
