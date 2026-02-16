# @thedanbob/esbuild-plugin-sass

Sass plugin for [esbuild](https://esbuild.github.io/). This is basically a heavily stripped down version of [esbuild-sass-plugin](https://github.com/glromeo/esbuild-sass-plugin), you should probably just use that one.

## Installation

```bash
npm install --save-dev esbuild @thedanbob/esbuild-plugin-sass
```

## How to use

```js
// esbuild.config.js
import { build } from "esbuild"
import sassPlugin from "@thedanbob/esbuild-plugin-sass"

await build({
  // ...
  plugins: [
    sassPlugin({ /* config */ })
  ]
});
```

```bash
node esbuild.config.js
```

## Config

### `filter`

Type: `RegExp`<br>
Default: `/.(s[ac]ss|css)$/`

Esbuild load filter (go syntax).

### `importers`
Type: `(NodePackageImporter | Importer<sync> | FileImporter<sync>)[]`<br>
Default: `[]`

Array of [importers](https://sass-lang.com/documentation/js-api/interfaces/options/#importers) passed to the Sass compiler.

### `transform`
Type: `(css: string, resolveDir: string, filePath: string) => string | Promise<string>`<br>
Default: `undefined`

Function that post-processes the CSS compiled by Sass before returning it to esbuild.

## License

MIT
