import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { build } from "esbuild";

const RUNTIME_EXPORTS = {
    "@vendetta/commands": ["registerCommand"],
    "@vendetta/constants": ["DISCORD_SERVER", "DISCORD_SERVER_ID", "PLUGINS_CHANNEL_ID", "THEMES_CHANNEL_ID", "GITHUB", "PROXY_PREFIX", "HTTP_REGEX", "HTTP_REGEX_MULTI"],
    "@vendetta/debug": ["connectToDebugger", "getDebugInfo"],
    "@vendetta/loader": ["identity", "config"],
    "@vendetta/metro": ["find", "findAll", "findByProps", "findByPropsAll", "findByName", "findByNameAll", "findByDisplayName", "findByDisplayNameAll", "findByTypeName", "findByTypeNameAll", "findByStoreName", "common"],
    "@vendetta/metro/common": ["constants", "channels", "i18n", "url", "toasts", "stylesheet", "clipboard", "assets", "invites", "commands", "navigation", "navigationStack", "NavigationNative", "Flux", "FluxDispatcher", "React", "ReactNative", "moment", "chroma", "lodash"],
    "@vendetta/patcher": ["after", "before", "instead"],
    "@vendetta/plugin": ["id", "manifest", "storage"],
    "@vendetta/plugins": ["plugins", "fetchPlugin", "installPlugin", "startPlugin", "stopPlugin", "removePlugin", "getSettings"],
    "@vendetta/storage": ["createProxy", "useProxy", "createStorage", "wrapSync", "awaitSyncWrapper", "createMMKVBackend", "createFileBackend"],
    "@vendetta/themes": ["themes", "fetchTheme", "installTheme", "selectTheme", "removeTheme", "getCurrentTheme", "updateThemes"],
    "@vendetta/ui": ["components", "toasts", "alerts", "assets", "semanticColors", "rawColors"],
    "@vendetta/ui/alerts": ["showConfirmationAlert", "showCustomAlert", "showInputAlert"],
    "@vendetta/ui/assets": ["all", "find", "getAssetByName", "getAssetByID", "getAssetIDByName"],
    "@vendetta/ui/components": ["Forms", "General", "Alert", "Button", "HelpMessage", "SafeAreaView", "Summary", "ErrorBoundary", "Codeblock", "Search"],
    "@vendetta/ui/toasts": ["showToast"],
    "@vendetta/utils": ["findInReactTree", "findInTree", "safeFetch", "unfreeze", "without"]
};

function runtimeModule(path) {
    const names = RUNTIME_EXPORTS[path];
    if (!names) throw new Error(`Unsupported Revenge runtime import: ${path}`);

    const expression = path.slice(1).replaceAll("/", ".");
    return [
        `const runtime = ${expression};`,
        "export default runtime;",
        ...names.map(name => `export const ${name} = runtime.${name};`)
    ].join("\n");
}

const root = fileURLToPath(new URL("..", import.meta.url));
const manifest = JSON.parse(await readFile(join(root, "revenge/manifest.json"), "utf8"));
const outDir = join(root, "dist");
const outFile = join(outDir, "index.js");

await mkdir(outDir, { recursive: true });
await build({
    entryPoints: [join(root, "revenge", manifest.main)],
    bundle: true,
    outfile: outFile,
    format: "iife",
    globalName: "$",
    banner: { js: "(()=>{" },
    footer: { js: "return $;})();" },
    target: "es2016",
    minify: true,
    plugins: [{
        name: "revenge-runtime",
        setup(builder) {
            builder.onResolve({ filter: /^@vendetta(?:\/|$)/ }, ({ path }) => ({ path, namespace: "revenge-runtime" }));
            builder.onLoad({ filter: /.*/, namespace: "revenge-runtime" }, ({ path }) => ({
                contents: runtimeModule(path),
                loader: "js"
            }));
        }
    }]
});

const bundled = await readFile(outFile);
const outputManifest = {
    ...manifest,
    main: "index.js",
    hash: createHash("sha256").update(bundled).digest("hex")
};
await writeFile(join(outDir, "manifest.json"), JSON.stringify(outputManifest));
console.log(`Built ${manifest.name} for Revenge`);
