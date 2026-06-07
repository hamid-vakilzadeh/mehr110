/* Precompile the JSX prototypes into plain, minified JS so the browser no
   longer needs @babel/standalone (3 MB) or runtime transpilation.

   We TRANSFORM each .jsx -> .js (classic JSX -> React.createElement, React/
   ReactDOM stay global from the production CDN). We minify whitespace + syntax
   but DO NOT rename identifiers — the files are loaded as classic scripts that
   share global scope (e.g. ui.js defines `fmt`/`Icon`, charts.js uses them), so
   top-level names must be preserved across files.

   Run:  npm --prefix web run build
*/
import * as esbuild from "esbuild";
import { readdirSync } from "fs";

const files = readdirSync(".").filter((f) => f.endsWith(".jsx"));

let total = 0;
for (const file of files) {
  const out = file.replace(/\.jsx$/, ".js");
  await esbuild.build({
    entryPoints: [file],
    outfile: out,
    bundle: false,            // transform only — keep the multi-script structure
    minifyWhitespace: true,
    minifySyntax: true,
    minifyIdentifiers: false, // preserve cross-file global names
    loader: { ".jsx": "jsx" },
    jsx: "transform",         // classic: emits React.createElement (React is global)
    legalComments: "none",
    target: ["es2018"],
  });
  total++;
  console.log("  built", out);
}
console.log(`Compiled ${total} JSX file(s) -> JS.`);
