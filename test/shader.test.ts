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

console.log(`\n${passed} shader checks passed`);
