#!/usr/bin/env node
import fs from "node:fs/promises"
import http from "node:http"
import path from "node:path"
import { fileURLToPath } from "node:url"

const brainDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const publicDir = path.join(brainDir, "public")
const port = Number(process.argv[2] ?? 8081)
const numericRanges = {
  scale: [0.4, 2.5],
  repelForce: [0.05, 2],
  centerForce: [0.05, 2],
  linkDistance: [10, 100],
  fontSize: [0.2, 1.5],
  opacityScale: [0.1, 3],
}
const booleanOptions = ["showTags", "focusOnHover", "enableRadial"]

function decodeAttribute(value) {
  return value.replaceAll("&quot;", '"').replaceAll("&amp;", "&")
}

function getGraphConfig(html, className) {
  const escapedClass = className.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  const match = html.match(new RegExp(`<div class="${escapedClass}" data-cfg="([^"]*)"`))
  if (!match) throw new Error(`Could not find ${className} config in ${publicDir}/index.html`)
  return JSON.parse(decodeAttribute(match[1]))
}

function getOverrides(searchParams, key, base) {
  let requested
  try {
    requested = JSON.parse(searchParams.get(key) ?? "{}")
  } catch {
    return base
  }

  const result = { ...base }
  for (const [option, [min, max]] of Object.entries(numericRanges)) {
    const value = Number(requested[option])
    if (Number.isFinite(value)) result[option] = Math.min(max, Math.max(min, value))
  }
  for (const option of booleanOptions) {
    if (typeof requested[option] === "boolean") result[option] = requested[option]
  }
  return result
}

function escapeAttribute(value) {
  return JSON.stringify(value).replaceAll("&", "&amp;").replaceAll('"', "&quot;")
}

function applyGraphOverrides(html, className, config) {
  const escapedClass = className.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  const pattern = new RegExp(`(<div class="${escapedClass}" data-cfg=")[^"]*(")`)
  return html.replace(pattern, `$1${escapeAttribute(config)}$2`)
}

function playgroundHtml(localConfig, globalConfig) {
  const initial = JSON.stringify({ local: localConfig, global: globalConfig }).replaceAll("<", "\\u003c")
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Graph Playground · Emerson's Desk</title>
  <style>
    :root { color-scheme: dark; font-family: ui-sans-serif, system-ui, sans-serif; background: #171717; color: #f1eee9; }
    * { box-sizing: border-box; }
    body { margin: 0; min-height: 100vh; }
    .shell { min-height: 100vh; display: grid; grid-template-columns: 300px minmax(0, 1fr); }
    aside { z-index: 1; padding: 22px 20px; background: #202020; border-right: 1px solid #393633; overflow-y: auto; }
    h1 { margin: 0 0 5px; font: 600 20px/1.2 Georgia, serif; }
    .intro { margin: 0 0 19px; color: #b8b2aa; font-size: 12px; line-height: 1.5; }
    .modes { display: grid; grid-template-columns: 1fr 1fr; gap: 5px; margin-bottom: 17px; }
    button { min-height: 34px; border: 1px solid #514c47; border-radius: 4px; padding: 6px 9px; background: #292725; color: #eee9e3; font: inherit; cursor: pointer; }
    button[aria-pressed="true"] { border-color: #e45c55; background: #512c2a; }
    .control { display: grid; grid-template-columns: 1fr auto; gap: 5px 10px; margin: 12px 0; font-size: 12px; }
    .control output { color: #e88c83; font-variant-numeric: tabular-nums; }
    .control input[type="range"] { grid-column: 1 / -1; width: 100%; accent-color: #d74640; }
    .toggle { display: flex; align-items: center; gap: 8px; margin: 13px 0; color: #d4cfc8; font-size: 12px; }
    .toggle input { accent-color: #d74640; }
    .actions { display: flex; gap: 8px; margin-top: 18px; }
    .actions button { flex: 1; }
    .yaml-label { margin: 19px 0 6px; color: #c5bfb7; font-size: 11px; }
    pre { max-height: 210px; overflow: auto; margin: 0; padding: 10px; border: 1px solid #393633; border-radius: 4px; background: #181716; color: #d9d0c5; font: 10px/1.55 ui-monospace, monospace; white-space: pre; }
    main { min-width: 0; min-height: 100vh; padding: 12px; }
    .stage { width: 100%; height: calc(100vh - 24px); min-height: 440px; border: 1px solid #393633; border-radius: 5px; overflow: hidden; background: #101010; }
    iframe { display: block; width: 100%; height: 100%; border: 0; }
    @media (max-width: 760px) {
      .shell { grid-template-columns: 1fr; }
      aside { border-right: 0; border-bottom: 1px solid #393633; }
      main { min-height: 65vh; padding: 8px; }
      .stage { height: 65vh; min-height: 380px; }
    }
  </style>
</head>
<body>
  <div class="shell">
    <aside>
      <h1>Graph Playground</h1>
      <p class="intro">Tune the real Desk graph. Changes reload the preview only; your site config stays untouched.</p>
      <div class="modes" aria-label="Graph view">
        <button type="button" data-mode="local" aria-pressed="true">Local</button>
        <button type="button" data-mode="global" aria-pressed="false">Global</button>
      </div>
      <div id="controls"></div>
      <div class="actions">
        <button id="reset" type="button">Reset values</button>
        <button id="copy" type="button">Copy YAML</button>
      </div>
      <p class="yaml-label">quartz.config.yaml</p>
      <pre id="yaml"></pre>
    </aside>
    <main><div class="stage"><iframe title="Live Quartz graph preview"></iframe></div></main>
  </div>
  <script>
    const defaults = ${initial}
    const state = { local: { ...defaults.local }, global: { ...defaults.global } }
    const ranges = {
      scale: ["Label scale", 0.4, 2.5, 0.05],
      repelForce: ["Repulsion", 0.05, 2, 0.05],
      centerForce: ["Centering", 0.05, 2, 0.05],
      linkDistance: ["Link distance", 10, 100, 1],
      fontSize: ["Font size", 0.2, 1.5, 0.05],
      opacityScale: ["Label opacity", 0.1, 3, 0.1],
    }
    const toggles = { showTags: "Show tags", focusOnHover: "Focus on hover", enableRadial: "Radial layout" }
    const controls = document.querySelector("#controls")
    const preview = document.querySelector("iframe")
    let mode = "local"
    let reloadTimer

    function yamlFor(config, indent = 8) {
      return Object.entries(config).map(([key, value]) => {
        const yamlValue = Array.isArray(value) ? "[]" : String(value)
        return " ".repeat(indent) + key + ": " + yamlValue
      }).join("\\n")
    }

    function yamlText() {
      return "plugins:\\n  - source: \\\"@quartz-community/graph\\\"\\n    options:\\n      " +
        "localGraph:\\n" + yamlFor(state.local) + "\\n      globalGraph:\\n" + yamlFor(state.global)
    }

    function updateYaml() {
      document.querySelector("#yaml").textContent = yamlText()
    }

    function refresh() {
      clearTimeout(reloadTimer)
      reloadTimer = setTimeout(() => {
        const query = new URLSearchParams({
          __gp: "1",
          __gp_local: JSON.stringify(state.local),
          __gp_global: JSON.stringify(state.global),
          __gp_reload: String(Date.now()),
        })
        preview.src = "/?" + query
      }, 250)
      updateYaml()
    }

    function renderControls() {
      controls.replaceChildren()
      for (const [key, [label, min, max, step]] of Object.entries(ranges)) {
        const wrapper = document.createElement("label")
        wrapper.className = "control"
        const name = document.createElement("span")
        name.textContent = label
        const output = document.createElement("output")
        output.textContent = Number(state[mode][key]).toFixed(step < 1 ? 2 : 0)
        const input = document.createElement("input")
        input.type = "range"
        input.min = min
        input.max = max
        input.step = step
        input.value = state[mode][key]
        input.addEventListener("input", () => {
          state[mode][key] = Number(input.value)
          output.textContent = Number(input.value).toFixed(step < 1 ? 2 : 0)
          refresh()
        })
        wrapper.append(name, output, input)
        controls.append(wrapper)
      }
      for (const [key, label] of Object.entries(toggles)) {
        const wrapper = document.createElement("label")
        wrapper.className = "toggle"
        const input = document.createElement("input")
        input.type = "checkbox"
        input.checked = Boolean(state[mode][key])
        input.addEventListener("change", () => {
          state[mode][key] = input.checked
          refresh()
        })
        wrapper.append(input, document.createTextNode(label))
        controls.append(wrapper)
      }
      document.querySelectorAll("[data-mode]").forEach((button) => {
        button.setAttribute("aria-pressed", String(button.dataset.mode === mode))
      })
      updateYaml()
    }

    document.querySelectorAll("[data-mode]").forEach((button) => button.addEventListener("click", () => {
      mode = button.dataset.mode
      renderControls()
      if (mode === "global" && preview.contentDocument?.readyState === "complete") {
        preview.contentDocument.querySelector(".global-graph-icon")?.click()
      }
    }))
    document.querySelector("#reset").addEventListener("click", () => {
      state.local = { ...defaults.local }
      state.global = { ...defaults.global }
      renderControls()
      refresh()
    })
    document.querySelector("#copy").addEventListener("click", async (event) => {
      await navigator.clipboard.writeText(yamlText())
      event.currentTarget.textContent = "Copied"
      setTimeout(() => { event.currentTarget.textContent = "Copy YAML" }, 1200)
    })
    preview.addEventListener("load", () => {
      if (mode === "global") preview.contentDocument?.querySelector(".global-graph-icon")?.click()
    })
    renderControls()
    refresh()
  </script>
</body>
</html>`
}

function contentType(filePath) {
  return ({
    ".css": "text/css; charset=utf-8",
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".svg": "image/svg+xml",
    ".webp": "image/webp",
    ".xml": "application/xml; charset=utf-8",
  })[path.extname(filePath)] ?? "application/octet-stream"
}

const homepage = await fs.readFile(path.join(publicDir, "index.html"), "utf8")
const defaults = {
  local: getGraphConfig(homepage, "graph-container"),
  global: getGraphConfig(homepage, "global-graph-container"),
}

const server = http.createServer(async (request, response) => {
  try {
    const url = new URL(request.url ?? "/", `http://${request.headers.host ?? "127.0.0.1"}`)
    if (url.pathname === "/graph-playground" || url.pathname === "/graph-playground/") {
      response.writeHead(200, { "content-type": "text/html; charset=utf-8" })
      response.end(playgroundHtml(defaults.local, defaults.global))
      return
    }

    const relativePath = decodeURIComponent(url.pathname === "/" ? "/index.html" : url.pathname)
    const filePath = path.resolve(publicDir, `.${relativePath}`)
    if (!filePath.startsWith(`${publicDir}${path.sep}`) && filePath !== path.join(publicDir, "index.html")) {
      response.writeHead(403).end("Forbidden")
      return
    }
    let body = await fs.readFile(filePath)
    if (url.searchParams.get("__gp") === "1" && path.extname(filePath) === ".html") {
      let html = body.toString("utf8")
      const local = getOverrides(url.searchParams, "__gp_local", defaults.local)
      const global = getOverrides(url.searchParams, "__gp_global", defaults.global)
      html = applyGraphOverrides(html, "graph-container", local)
      html = applyGraphOverrides(html, "global-graph-container", global)
      const isolationStyles = `<style>
        html, body, #quartz-root, #quartz-body, #quartz-body > .center { width:100%!important; height:100%!important; min-height:0!important; margin:0!important; padding:0!important; }
        body { overflow:hidden!important; }
        #quartz-body { display:block!important; }
        #quartz-body > .left.sidebar, #quartz-body > .right.sidebar { display:none!important; }
        #quartz-body > .center { display:block!important; }
        #quartz-body > .center > :not(.page-footer), .page-footer > :not(.graph) { display:none!important; }
        .page-footer { display:block!important; margin:0!important; padding:0!important; }
        .graph { position:fixed!important; inset:0!important; display:flex!important; flex-direction:column!important; width:100vw!important; height:100vh!important; margin:0!important; padding:14px!important; box-sizing:border-box!important; }
        .graph-outer { flex:1 1 auto!important; min-height:0!important; height:auto!important; }
        .graph-container { height:100%!important; }
      </style>`
      html = html.replace("</head>", `${isolationStyles}</head>`)
      body = Buffer.from(html)
    }
    response.writeHead(200, { "content-type": contentType(filePath) })
    response.end(body)
  } catch (error) {
    response.writeHead(error.code === "ENOENT" ? 404 : 500, { "content-type": "text/plain; charset=utf-8" })
    response.end(error.code === "ENOENT" ? "Not found" : error.message)
  }
})

server.listen(port, "127.0.0.1", () => {
  console.log(`Graph Playground: http://127.0.0.1:${port}/graph-playground`)
  console.log("Serving the current brain/public build; stop with Ctrl-C.")
})