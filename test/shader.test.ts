/**
 * Static checks on the shaders.
 *
 * Every shader here is a TypeScript template literal, several assembled by
 * concatenation. That means a renamed uniform passes the type checker, passes
 * the other two suites, passes `next build`, deploys — and shows the reader an
 * error card. This suite closes that gap without a browser: it reads the source,
 * extracts what each shader declares, extracts what the TypeScript asks for, and
 * insists the two agree.
 */
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

let passed = 0;
const check = (name: string, fn: () => void) => {
  fn();
  passed++;
  console.log(`  ok  ${name}`);
};

const ROOT = new URL('..', import.meta.url).pathname;

function collectSources(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(join(ROOT, dir), { withFileTypes: true })) {
    const rel = `${dir}/${entry.name}`;
    if (entry.isDirectory()) collectSources(rel, out);
    else if (/\.tsx?$/.test(entry.name)) out.push(rel);
  }
  return out;
}

const FILES = [...collectSources('lib/gl'), ...collectSources('components/labs'), ...collectSources('components/tech')];

interface Shader {
  file: string;
  body: string;
}

/** Every template literal that looks like a shader, with its file. */
function shadersIn(file: string): Shader[] {
  const text = readFileSync(join(ROOT, file), 'utf8');
  const found: Shader[] = [];
  const literal = /`([^`]*)`/g;
  let match: RegExpExecArray | null;
  while ((match = literal.exec(text))) {
    const body = match[1];
    if (/\b(void\s+main|@vertex|@fragment|@compute)\b/.test(body)) {
      found.push({ file, body });
    }
  }
  return found;
}

const ALL_SHADERS = FILES.flatMap(shadersIn);

console.log('shaders');

check('the suite actually found shaders to check', () => {
  assert.ok(ALL_SHADERS.length >= 10, `only found ${ALL_SHADERS.length}`);
});

check('every GLSL shader declares a main()', () => {
  for (const shader of ALL_SHADERS) {
    if (/@vertex|@fragment|@compute/.test(shader.body)) continue; // WGSL
    assert.match(shader.body, /void\s+main\s*\(/, `no main() in a shader in ${shader.file}`);
  }
});

check('braces balance in every shader', () => {
  for (const shader of ALL_SHADERS) {
    const open = (shader.body.match(/\{/g) ?? []).length;
    const close = (shader.body.match(/\}/g) ?? []).length;
    assert.equal(open, close, `unbalanced braces in a shader in ${shader.file}`);
  }
});

/**
 * A template literal holding only a `main()` and no declarations of its own
 * cannot be a whole shader — it is a body concatenated onto a preamble, which
 * is how the shader-writing lab supplies uniforms the reader did not type. The
 * exemption is narrow on purpose: the body must declare nothing, AND the file
 * must contain a preamble that does declare a precision. A real standalone
 * fragment shader missing its precision qualifier is still caught.
 */
function isBodyOnly(shader: Shader): boolean {
  const declaresNothing = !/\b(varying|uniform|attribute)\b/.test(shader.body);
  // Read the file rather than the collected shaders: a preamble declares
  // uniforms and a precision but has no main(), so it is never collected.
  const text = readFileSync(join(ROOT, shader.file), 'utf8');
  const fileHasPreamble = /precision\s+(low|medium|high)p\s+float/.test(text);
  return declaresNothing && fileHasPreamble;
}

check('no GLSL shader references gl_FragColor without being a fragment shader', () => {
  for (const shader of ALL_SHADERS) {
    if (!shader.body.includes('gl_FragColor')) continue;
    if (isBodyOnly(shader)) continue;
    assert.ok(
      shader.body.includes('precision'),
      `fragment shader in ${shader.file} declares no float precision, which fails on some mobile drivers`,
    );
  }
});

/**
 * Every backtick literal in a file, shader or not.
 *
 * Shaders here are assembled from fragments — ShadingLab keeps its uniform block
 * in a separate constant and interpolates it into three programs — so reading
 * only the shader-shaped literals sees `${UNIFORMS}` rather than the
 * declarations it stands for. Scanning every literal resolves that without
 * having to evaluate the module.
 */
function allLiteralsIn(file: string): string {
  const text = readFileSync(join(ROOT, file), 'utf8');
  return [...text.matchAll(/`([^`]*)`/g)].map((match) => match[1]).join('\n');
}

/** Names a GLSL shader declares as uniform / attribute. */
function declaredNames(body: string): Set<string> {
  const names = new Set<string>();
  const glsl = /\b(?:uniform|attribute)\s+\w+\s+(\w+)\s*(?:\[[^\]]*\])?\s*;/g;
  let match: RegExpExecArray | null;
  while ((match = glsl.exec(body))) names.add(match[1]);
  return names;
}

/** Names the TypeScript asks the GL layer for. */
function requestedNames(text: string): Set<string> {
  const names = new Set<string>();
  const call = /\.(?:uniform|attrib)\(\s*'([^']+)'\s*\)/g;
  let match: RegExpExecArray | null;
  while ((match = call.exec(text))) names.add(match[1]);
  return names;
}

check('every uniform and attribute asked for is declared in a shader in the same file', () => {
  // The shared scene kit's shaders are visible to every lab that uses it.
  const sharedDeclared = declaredNames(allLiteralsIn('lib/gl/scene.ts'));

  for (const file of FILES) {
    const text = readFileSync(join(ROOT, file), 'utf8');
    const requested = requestedNames(text);
    if (requested.size === 0) continue;

    const declared = new Set(sharedDeclared);
    for (const name of declaredNames(allLiteralsIn(file))) declared.add(name);

    for (const name of requested) {
      assert.ok(
        declared.has(name),
        `${file} asks for "${name}", which no shader it can see declares — this compiles, deploys, and renders nothing`,
      );
    }
  }
});

check('every declared attribute in the shared kit is actually bound somewhere', () => {
  const bound = new Set<string>();
  for (const file of FILES) {
    for (const name of requestedNames(readFileSync(join(ROOT, file), 'utf8'))) {
      bound.add(name);
    }
  }
  const attributes = allLiteralsIn('lib/gl/scene.ts').match(/\battribute\s+\w+\s+(\w+)\s*;/g) ?? [];
  for (const declaration of attributes) {
    const name = declaration.replace(/\battribute\s+\w+\s+/, '').replace(/\s*;/, '');
    assert.ok(bound.has(name), `shared shader declares "${name}" that nothing binds`);
  }
});

check('WGSL entry points referenced from TypeScript exist in the shader', () => {
  for (const file of FILES) {
    const text = readFileSync(join(ROOT, file), 'utf8');
    const entries = [...text.matchAll(/entryPoint:\s*'([^']+)'/g)].map((m) => m[1]);
    if (entries.length === 0) continue;
    const wgsl = allLiteralsIn(file);
    for (const entry of entries) {
      assert.match(
        wgsl,
        new RegExp(`fn\\s+${entry}\\s*\\(`),
        `${file} names entry point "${entry}" that its WGSL does not define`,
      );
    }
  }
});


/* ------------------------------------------------------- the GL call sites ---
 * Lab 1's essay tells the reader that a Mat4 goes to the GPU untouched, that the
 * `false` in `uniformMatrix4fv(location, false, m)` is a transpose flag, and
 * that in WebGL 1 — "which every canvas on this page runs on" — passing `true`
 * is an error rather than an option.
 *
 * The spec half of that is not this repo's to prove. The two premises underneath
 * it are, and were the only sentence on the site that nothing checked: that the
 * canvases really are WebGL 1, and that nothing anywhere passes anything but
 * `false`. Switch GLCanvas to a webgl2 context, or transpose a matrix on upload,
 * and the essay silently becomes wrong. Now the build says so instead.
 */

const GL_SOURCES = [
  ...collectSources('lib/gl'),
  ...collectSources('lib/math'),
  ...collectSources('components/lab'),
  ...collectSources('components/labs'),
  ...collectSources('components/tech'),
];

check('every matrix upload passes the transpose flag as false', () => {
  let found = 0;
  for (const file of GL_SOURCES) {
    const text = readFileSync(join(ROOT, file), 'utf8');
    for (const match of text.matchAll(/\w+\.uniformMatrix[234]fv\(/g)) {
      // Walk forward from the open paren, balancing, to get the whole arg list.
      let level = 1;
      let i = match.index! + match[0].length;
      while (i < text.length && level > 0) {
        if (text[i] === '(') level++;
        else if (text[i] === ')') level--;
        i++;
      }
      const args = text.slice(match.index! + match[0].length, i - 1).replace(/\s+/g, ' ');
      found++;
      assert.ok(
        /, ?false ?,/.test(args),
        `${file} uploads a matrix without transpose=false — lab 1 tells the reader this is always false, and in WebGL 1 anything else is an error:\n    ${args.slice(0, 90)}`,
      );
    }
  }
  assert.ok(found >= 10, `expected to find the matrix uploads, found ${found}`);
});

check('the shared canvas really is WebGL 1', () => {
  const source = readFileSync(join(ROOT, 'components/lab/GLCanvas.tsx'), 'utf8');
  assert.match(
    source,
    /getContext\(\s*'webgl'/,
    "GLCanvas no longer requests a WebGL 1 context — lab 1 says every canvas on that page runs on WebGL 1, and scopes its claim about the transpose flag to it",
  );
  assert.ok(
    !/getContext\(\s*'webgl2'/.test(source),
    'GLCanvas requests webgl2, which relaxes the transpose rule lab 1 describes',
  );
});

console.log(`\n${passed} shader checks passed`);
