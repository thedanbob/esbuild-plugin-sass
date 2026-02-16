import { Plugin, PartialMessage } from "esbuild"
import { compile, Options, Logger } from "sass"
import { dirname } from "node:path"
import { fileURLToPath } from "node:url"

export interface PluginOptions {
  filter?: RegExp
  importers?: Options<"sync">["importers"]
  transform?: (css: string, resolveDir: string, filePath: string) => string | Promise<string>
}

export default ({
  filter = /.(s[ac]ss|css)$/,
  importers = [],
  transform = undefined
}: PluginOptions = {}): Plugin => ({
  name: "sass",
  setup: async ({ initialOptions, onLoad }) => {
    onLoad({ filter }, async ({ path }) => {
      const resolveDir = dirname(path)
      const warnings: PartialMessage[] = []
      const logger: Logger = {
        warn: function (message, opts) {
          if (!opts.span) {
            warnings.push({ text: `sass warning: ${message}` })
          } else {
            warnings.push({
              text: message,
              location: {
                file: opts.span.url?.pathname ?? path,
                line: opts.span.start.line,
                column: opts.span.start.column,
                lineText: opts.span.text
              },
              detail: {
                deprecation: opts.deprecation,
                stack: opts.stack
              }
            })
          }
        }
      }

      const { css, loadedUrls, sourceMap } = compile(path, {
        sourceMap: !!initialOptions.sourcemap,
        sourceMapIncludeSources: true,
        logger,
        importers
      })

      let cssText = css.toString()

      if (sourceMap) {
        const data = Buffer.from(JSON.stringify(sourceMap), "utf-8").toString("base64")
        const sm = `/*# sourceMappingURL=data:application/json;charset=utf-8;base64,${data} */`
        cssText += "\n" + sm
      }

      if (transform) {
        cssText = await transform(cssText, resolveDir, path)
      }

      const watchFiles = [path, ...loadedUrls.map(u => fileURLToPath(u))]

      return {
        contents: cssText,
        loader: "css",
        resolveDir,
        warnings,
        watchFiles
      }
    })
  }
})
