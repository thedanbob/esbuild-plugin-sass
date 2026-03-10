import { Plugin, PartialMessage } from "esbuild"
import { compile, DeprecationOrId, Logger } from "sass"
import { sassSyntax, canonicalize } from "./utils.js"
import { dirname } from "node:path"
import { fileURLToPath } from "node:url"
import { readFileSync } from "node:fs"

export interface PluginOptions {
  filter?: RegExp
  quietDeps?: boolean
  silenceDeprecations?: DeprecationOrId[]
  precompile?: (source: string, filePath: string) => string
  transform?: (css: string, filePath: string) => string | Promise<string>
}

export default ({
  filter = /\.(s[ac]ss|css)$/,
  quietDeps = false,
  silenceDeprecations = [],
  precompile = undefined,
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
        quietDeps,
        silenceDeprecations,
        importers: [{
          canonicalize,
          load: (canonicalUrl) => {
            const path = fileURLToPath(canonicalUrl)
            let contents = readFileSync(canonicalUrl, "utf8")
            if (precompile) {
              contents = precompile(contents, path)
            }

            return {
              contents,
              syntax: sassSyntax(path),
              sourceMapUrl: initialOptions.sourcemap ? canonicalUrl : undefined
            }
          }
        }]
      })

      let contents = css.toString()

      if (sourceMap) {
        const data = Buffer.from(JSON.stringify(sourceMap), "utf-8").toString("base64")
        contents += `\n/*# sourceMappingURL=data:application/json;charset=utf-8;base64,${data} */`
      }

      if (transform) {
        contents = await transform(contents, path)
      }

      return {
        loader: "css",
        contents,
        resolveDir,
        warnings,
        watchFiles: [path, ...loadedUrls.map(u => fileURLToPath(u))]
      }
    })
  }
})
