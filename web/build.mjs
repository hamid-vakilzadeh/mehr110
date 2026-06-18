/* Build the deployable site: src/ (hand-edited source) -> public/ (generated).

   • Compile each src/jsx/*.jsx -> public/<name>.js  (classic JSX -> React.createElement;
     React/ReactDOM stay global from the production CDN). Whitespace+syntax minified,
     identifiers PRESERVED — files load as classic scripts sharing global scope
     (e.g. ui.js defines `fmt`/`Icon`, charts.js uses them).
   • Copy the hand-written js (src/js), styles (src/styles), pages (src/pages) and
     assets (src/assets) FLAT into public/ so all existing same-dir relative refs
     (<script src="api.js">, href="tokens.css", logo.png, manifest, favicons) keep working.
   • public/ is 100% generated and git-ignored; never edit it. Edit src/ then rebuild.
   • src/screenshots is dev-only (was never served) and is intentionally NOT copied.

   Run:  npm --prefix web run build
*/
import * as esbuild from "esbuild";
import { readdirSync, rmSync, mkdirSync, copyFileSync, existsSync } from "fs";
import { join } from "path";

const SRC = "src";
const OUT = "public";

// fresh, deterministic output dir
rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

// 1) compile jsx -> public/*.js
const jsxDir = join(SRC, "jsx");
const jsxFiles = readdirSync(jsxDir).filter((f) => f.endsWith(".jsx"));
let compiled = 0;
for (const file of jsxFiles) {
  await esbuild.build({
    entryPoints: [join(jsxDir, file)],
    outfile: join(OUT, file.replace(/\.jsx$/, ".js")),
    bundle: false,            // transform only — keep the multi-script structure
    minifyWhitespace: true,
    minifySyntax: true,
    minifyIdentifiers: false, // preserve cross-file global names
    loader: { ".jsx": "jsx" },
    jsx: "transform",         // classic: emits React.createElement (React is global)
    legalComments: "none",
    target: ["es2018"],
  });
  compiled++;
  console.log("  built", file, "-> public/" + file.replace(/\.jsx$/, ".js"));
}

// 2) copy static source (hand-written js, styles, pages, assets) FLAT into public/
function copyFlat(dir) {
  if (!existsSync(dir)) return 0;
  let n = 0;
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.isFile()) { copyFileSync(join(dir, e.name), join(OUT, e.name)); n++; }
  }
  return n;
}
const copied =
  copyFlat(join(SRC, "js")) +
  copyFlat(join(SRC, "styles")) +
  copyFlat(join(SRC, "pages")) +
  copyFlat(join(SRC, "assets"));

console.log(`Compiled ${compiled} JSX -> public/*.js; copied ${copied} static file(s) into public/.`);
