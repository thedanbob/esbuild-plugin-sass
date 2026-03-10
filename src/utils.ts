import { Syntax, Importer } from "sass"
import { statSync } from "node:fs"

const isFile = (url: URL) => !!statSync(url, { throwIfNoEntry: false })?.isFile()
const isDir = (url: URL) => !!statSync(url, { throwIfNoEntry: false })?.isDirectory()

const sassSyntax = (path: string) => (path.match(/\.(s?css)$/)?.[1] || "indented") as Syntax

const canonicalize: Importer<"sync">["canonicalize"] = (url, { containingUrl }) => {
  let orig: URL
  if (url.startsWith("~")) {
    try {
      // import.meta.resolve searches for an index file by default, which isn't guaranteed to exist.
      // Instead, we attempt to resolve <package>/package.json
      const pkg = url.replace(/^~(.+?)\/.+/, "$1/package.json")
      orig = new URL(url.substring(1), import.meta.resolve(pkg).replace(/(?<=node_modules\/).+/, ""))
    } catch {
      return null
    }
  }

  orig ||= new URL(url, containingUrl || undefined)
  if (isFile(orig)) return orig

  const file = new URL(orig)

  if (orig.pathname.match(/\.s[ac]ss$/)) {
    file.href = orig.href.replace(/\/([^/]+)$/, "/_$1")
    if (isFile(file)) return file
  } else {
    file.pathname = orig.pathname + ".scss"
    if (isFile(file)) return file
    file.pathname = orig.pathname + ".sass"
    if (isFile(file)) return file
    file.pathname = orig.pathname.replace(/\/([^/]+)$/, "/_$1.scss")
    if (isFile(file)) return file
    file.pathname = orig.pathname.replace(/\/([^/]+)$/, "/_$1.sass")
    if (isFile(file)) return file
  }

  if (isDir(orig)) {
    for (const idx in ["index.scss", "index.sass", "_index.scss", "_index.sass"]) {
      file.pathname = `${orig.pathname}/${idx}`
      if (isFile(file)) return file
    }
  }

  return null
}

export {
  sassSyntax,
  canonicalize
}
