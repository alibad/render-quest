'use client';

import React, { useState, useCallback, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import WebGLRenderer from '@/components/tutorials/shared/WebGLRenderer';
import { Button } from '@/components/shared/ui/button';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';

const MonacoEditor = dynamic(() => import('@monaco-editor/react'), { ssr: false });

const introContent = `
# Introduction to WebGL

WebGL (Web Graphics Library) is a JavaScript API for rendering interactive 2D and 3D graphics within any compatible web browser without the use of plug-ins. WebGL is integrated completely into all the web standards of the browser, allowing GPU accelerated usage of physics and image processing and effects as part of the web page canvas.

![WebGL Example](https://example.com/webgl-example.jpg)

## Key Concepts in WebGL:

1. **WebGL Context**: The foundation for all WebGL operations.
2. **Shaders**: Programs that run on the GPU to process vertices and fragments.
3. **Buffers**: Memory objects that store vertex data.
4. **Attributes and Uniforms**: Ways to pass data to shaders.

In this tutorial, we'll walk through the basics of setting up a WebGL context and creating simple shapes. Let's get started!

### What You'll Learn:

- Setting up a WebGL context
- Creating and using shaders
- Drawing basic shapes
- Applying colors and transformations

Are you ready to dive into the world of WebGL? Click the "Start Tutorial" button below!
`;

const tutorialSteps = [
  {
    title: "Set up WebGL Context",
    instructions: `
## Setting up the WebGL Context

In this step, we'll initialize the WebGL context. This is the crucial first step in any WebGL application.

1. First, we get the canvas element from the DOM.
2. Then, we try to get the WebGL context from the canvas.
3. If successful, we set the clear color and clear the buffer.

Try running the code and check the console for the success message!
    `,
    code: `
// Set clear color to black, fully opaque
gl.clearColor(0.0, 0.0, 0.0, 1.0);
// Clear the color buffer with specified clear color
gl.clear(gl.COLOR_BUFFER_BIT);

console.log('WebGL context initialized successfully!');
    `,
  },
  {
    title: "Create Shaders",
    instructions: "Now, let's create vertex and fragment shaders. These are essential for rendering in WebGL.",
    code: `
// Get the canvas element
const canvas = document.getElementById('webgl-canvas');
const gl = canvas.getContext('webgl');

if (!gl) {
  console.error('Unable to initialize WebGL. Your browser may not support it.');
  return;
}

// Vertex shader program
const vsSource = \`
  attribute vec4 aVertexPosition;
  void main() {
    gl_Position = aVertexPosition;
  }
\`;

// Fragment shader program
const fsSource = \`
  void main() {
    gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);
  }
\`;

// Create shader function
function createShader(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error('An error occurred compiling the shaders: ' + gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  
  return shader;
}

const vertexShader = createShader(gl, gl.VERTEX_SHADER, vsSource);
const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fsSource);

console.log('Shaders created successfully!');
    `,
  },
  {
    title: "Create Program and Set Up Vertices",
    instructions: "Let's create a program from our shaders and set up the vertices for a triangle.",
    code: `
// ... (Previous WebGL setup and shader code) ...

// Create the shader program
const shaderProgram = gl.createProgram();
gl.attachShader(shaderProgram, vertexShader);
gl.attachShader(shaderProgram, fragmentShader);
gl.linkProgram(shaderProgram);

if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
  console.error('Unable to initialize the shader program: ' + gl.getProgramInfoLog(shaderProgram));
  return;
}

// Set up the vertices for a triangle
const vertices = [
   0.0,  0.5,  0.0,
  -0.5, -0.5,  0.0,
   0.5, -0.5,  0.0
];

const vertexBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

const aVertexPosition = gl.getAttribLocation(shaderProgram, 'aVertexPosition');

console.log('Program created and vertices set up!');
    `,
  },
  {
    title: "Draw the Triangle",
    instructions: "Finally, let's draw our triangle!",
    code: `
// ... (Previous WebGL setup, shader, and buffer code) ...

// Clear the canvas
gl.clearColor(0.0, 0.0, 0.0, 1.0);
gl.clear(gl.COLOR_BUFFER_BIT);

// Use our shader program
gl.useProgram(shaderProgram);

// Enable the vertex attribute
gl.enableVertexAttribArray(aVertexPosition);

// Point an attribute to the currently bound VBO
gl.vertexAttribPointer(aVertexPosition, 3, gl.FLOAT, false, 0, 0);

// Draw the triangle
gl.drawArrays(gl.TRIANGLES, 0, 3);

console.log('Triangle drawn!');
    `,
  },
  {
    title: "Final Step: Complete WebGL Scene",
    instructions: `
## Complete WebGL Scene

This is the final state of our WebGL tutorial. It includes all the concepts we've covered:
- Using the WebGL context
- Creating and using shaders
- Drawing a simple shape (triangle)
- Applying colors

Run the code to see the final result!
    `,
    code: `
// Vertex shader program
const vsSource = \`
  attribute vec4 aVertexPosition;
  void main() {
    gl_Position = aVertexPosition;
  }
\`;

// Fragment shader program
const fsSource = \`
  precision mediump float;
  void main() {
    gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);
  }
\`;

// Create shader function
function createShader(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error('An error occurred compiling the shaders: ' + gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  
  return shader;
}

const vertexShader = createShader(gl, gl.VERTEX_SHADER, vsSource);
const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fsSource);

// Create the shader program
const shaderProgram = gl.createProgram();
gl.attachShader(shaderProgram, vertexShader);
gl.attachShader(shaderProgram, fragmentShader);
gl.linkProgram(shaderProgram);

if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
  console.error('Unable to initialize the shader program: ' + gl.getProgramInfoLog(shaderProgram));
  return;
}

// Set up the vertex data
const vertices = [
   0.0,  0.5,  0.0,
  -0.5, -0.5,  0.0,
   0.5, -0.5,  0.0
];

const vertexBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

const aVertexPosition = gl.getAttribLocation(shaderProgram, 'aVertexPosition');

// Render the scene
gl.clearColor(0.0, 0.0, 0.0, 1.0);
gl.clear(gl.COLOR_BUFFER_BIT);

gl.useProgram(shaderProgram);

gl.enableVertexAttribArray(aVertexPosition);
gl.vertexAttribPointer(aVertexPosition, 3, gl.FLOAT, false, 0, 0);

gl.drawArrays(gl.TRIANGLES, 0, 3);

console.log('WebGL scene rendered successfully!');
    `,
  },
];

export default function GettingStartedWithWebGLPage() {
  const [currentView, setCurrentView] = useState<'intro' | 'tutorial'>('intro');
  const [code, setCode] = useState(tutorialSteps[tutorialSteps.length - 1].code);
  const [currentStep, setCurrentStep] = useState(-1);
  const [iframeKey, setIframeKey] = useState(0);
  const [showCode, setShowCode] = useState(false);

  const handleCodeChange = (newCode: string | undefined) => {
    setCode(newCode || '');
  };

  const handleStepChange = (step: number) => {
    setCurrentStep(step);
    setCode(tutorialSteps[step].code);
    runCode(tutorialSteps[step].code);
  };

  const handleRunCode = useCallback(() => {
    runCode(code);
  }, [code]);

  const runCode = (codeToRun: string) => {
    fetch('/api/webgl-runtime', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ code: codeToRun }),
    }).then(() => {
      setIframeKey(prev => prev + 1);  // Force iframe refresh
    });
  };

  const toggleCodeView = () => {
    setShowCode(!showCode);
  };

  const startTutorial = () => {
    setCurrentView('tutorial');
    setCurrentStep(0);
    setCode(tutorialSteps[0].code);
    runCode(tutorialSteps[0].code);
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-grow container mx-auto px-4 py-8">

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-4">
            {currentView === 'intro' ? (
              <>
                <div className="prose dark:prose-invert max-w-none">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    rehypePlugins={[rehypeRaw]}
                  >
                    {introContent}
                  </ReactMarkdown>
                </div>
                <Button onClick={startTutorial}>Start Tutorial</Button>
              </>
            ) : showCode ? (
              <>
                <h2 className="text-2xl font-semibold">Source Code</h2>
                <div className="h-[calc(100vh-300px)] border border-gray-300 rounded">
                  <MonacoEditor
                    height="100%"
                    language="javascript"
                    theme="vs-dark"
                    value={code}
                    onChange={handleCodeChange}
                    options={{
                      minimap: { enabled: false },
                      scrollBeyondLastLine: false,
                      fontSize: 14,
                    }}
                  />
                </div>
                <div className="flex justify-between">
                  <Button onClick={handleRunCode}>Run Code</Button>
                  <Button onClick={toggleCodeView}>Back to Instructions</Button>
                </div>
              </>
            ) : (
              <>
                <div className="prose dark:prose-invert max-w-none">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    rehypePlugins={[rehypeRaw]}
                  >
                    {currentStep === -1 ? "This is the final result of the tutorial. Click 'Start Tutorial' to begin from the first step." : tutorialSteps[currentStep].instructions}
                  </ReactMarkdown>
                </div>
                <div className="flex justify-between">
                  {currentStep > -1 && (
                    <>
                      <Button
                        onClick={() => handleStepChange(Math.max(0, currentStep - 1))}
                        disabled={currentStep === 0}
                      >
                        Previous
                      </Button>
                      <Button onClick={toggleCodeView}>View Code</Button>
                      <Button
                        onClick={() => handleStepChange(Math.min(tutorialSteps.length - 1, currentStep + 1))}
                        disabled={currentStep === tutorialSteps.length - 1}
                      >
                        Next
                      </Button>
                    </>
                  )}
                  {currentStep === -1 && (
                    <Button onClick={startTutorial}>Start Tutorial</Button>
                  )}
                </div>
              </>
            )}
          </div>
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold">WebGL Output</h2>
            <div className="h-[calc(100vh-300px)] border border-gray-300 rounded overflow-hidden">
              <iframe 
                src={`/webgl-runtime#${encodeURIComponent(code)}`}
                width="100%" 
                height="100%" 
                key={iframeKey}
              />
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}