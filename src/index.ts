import { Plugin, PartialMessage } from "esbuild"
import { compile, DeprecationOrId, Logger, FileImporter } from "sass"
import { dirname } from "node:path"
import { fileURLToPath } from "node:url"

const importer: FileImporter = {
  findFileUrl: (url) => {
    if (!url.startsWith("~")) return null

    try {
      // import.meta.resolve searches for an index file by default, which isn't guaranteed to exist.
      // Instead, we attempt to resolve <package>/package.json
      const file = url.replace(/^~(.+?)\/.+/, "$1/package.json")
      return new URL(url.substring(1), import.meta.resolve(file).replace(/(?<=node_modules\/).+/, ""))
    } catch {
      return null
    }
  }
}

export interface PluginOptions {
  filter?: RegExp
  quietDeps?: boolean
  silenceDeprecations?: DeprecationOrId[]
  transform?: (css: string, resolveDir: string, filePath: string) => string | Promise<string>
}

export default ({
  filter = /.(s[ac]ss|css)$/,
  quietDeps = false,
  silenceDeprecations = [],
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
        importers: [importer]
      })

      let contents = css.toString()

      if (sourceMap) {
        const data = Buffer.from(JSON.stringify(sourceMap), "utf-8").toString("base64")
        contents += `\n/*# sourceMappingURL=data:application/json;charset=utf-8;base64,${data} */`
      }

      if (transform) {
        contents = await transform(contents, resolveDir, path)
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
