import fs from "node:fs"
import path from "node:path"

import type { Plugin, ViteDevServer } from "vite"

interface AppJson {
  manifestVersion?: number
  appID?: string
  blockTypeID?: string
  projectName?: string
  contributes?: Record<string, unknown>
  [key: string]: unknown
}

interface DocsAddonPluginOptions {
  /** Path to app.json, defaults to ./app.json */
  appJsonPath?: string
}

/**
 * Vite plugin that replicates the behavior of
 * @lark-opdev/block-docs-addon-webpack-utils for docs-addon development.
 *
 * Dev mode:
 * - base: /block/ (matching webpack publicPath convention)
 * - CORS + Access-Control-Allow-Private-Network for Lark iframe access
 * - Serves /block/project.config.json and /block/index/index.json
 *   so the Lark document can discover the local widget
 *
 * Build mode:
 * - base: ./ (relative paths for CDN deployment)
 * - Emits project.config.json and index.json into dist/
 */
export default function docsAddonPlugin(
  options: DocsAddonPluginOptions = {},
): Plugin {
  const appJsonPath = options.appJsonPath ?? "app.json"
  let appJson: AppJson

  function readAppJson(): AppJson {
    const raw = fs.readFileSync(
      path.resolve(process.cwd(), appJsonPath),
      "utf-8",
    )
    return JSON.parse(raw)
  }

  function getProjectConfig() {
    return {
      appid: appJson.appID ?? "",
      projectname: appJson.projectName ?? "",
      blocks: ["index"],
    }
  }

  function getBlockConfig() {
    return {
      blockTypeID: appJson.blockTypeID ?? "",
      blockRenderType: "offlineWeb",
      offlineWebConfig: {
        contributes: appJson.contributes ?? {},
      },
    }
  }

  return {
    name: "vite-plugin-docs-addon",

    config(_, { command }) {
      appJson = readAppJson()

      if (command === "build") {
        return {
          base: "./",
        }
      }
      return {
        base: "/block/",
        server: {
          cors: true,
          headers: {
            "Access-Control-Allow-Private-Network": "true",
          },
        },
      }
    },

    configureServer(server: ViteDevServer) {
      // Serve config files that the Lark document fetches to discover local widgets
      server.middlewares.use((req, res, next) => {
        if (req.url === "/block/project.config.json") {
          res.setHeader("Content-Type", "application/json")
          res.setHeader("Access-Control-Allow-Origin", "*")
          res.setHeader("Access-Control-Allow-Private-Network", "true")
          res.end(JSON.stringify(getProjectConfig()))
          return
        }

        if (req.url === "/block/index/index.json") {
          res.setHeader("Content-Type", "application/json")
          res.setHeader("Access-Control-Allow-Origin", "*")
          res.setHeader("Access-Control-Allow-Private-Network", "true")
          res.end(JSON.stringify(getBlockConfig()))
          return
        }

        next()
      })

      server.httpServer?.once("listening", () => {
        const address = server.httpServer?.address()
        if (!address || typeof address === "string") return
        const port = address.port

        console.log(
          `\n  Docs Addon Dev Server ready on port ${port}.` +
            `\n  Open a Lark document and append these params to the URL:` +
            `\n  ?blockitdebug=true&debugport=${port}\n`,
        )
      })
    },

    generateBundle() {
      this.emitFile({
        type: "asset",
        fileName: "project.config.json",
        source: JSON.stringify(getProjectConfig()),
      })

      this.emitFile({
        type: "asset",
        fileName: "index.json",
        source: JSON.stringify(getBlockConfig()),
      })
    },
  }
}
