'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import TutorialContent from '@/components/tutorials/GettingStartedWithWebGL/TutorialContent';
import WebGLRenderer from '@/components/tutorials/shared/WebGLRenderer';
import StepGuide from '@/components/tutorials/GettingStartedWithWebGL/StepGuide';
import { Button } from '@/components/shared/ui/button';

const MonacoEditor = dynamic(() => import('@monaco-editor/react'), { ssr: false });

const tutorialSteps = [
  {
    title: "Set up WebGL Context",
    instructions: "First, we need to set up the WebGL context. This code gets the canvas element and initializes WebGL.",
    code: `
// Get WebGL context
const canvas = document.getElementById('webgl-canvas');
const gl = canvas.getContext('webgl');

if (!gl) {
  throw new Error('WebGL not supported');
}

// Set clear color to black, fully opaque
gl.clearColor(0.0, 0.0, 0.0, 1.0);
// Clear the color buffer with specified clear color
gl.clear(gl.COLOR_BUFFER_BIT);
    `,
  },
  {
    title: "Create Shaders",
    instructions: "Now, let's create vertex and fragment shaders. These are essential for rendering in WebGL.",
    code: `
// Get WebGL context
const canvas = document.getElementById('webgl-canvas');
const gl = canvas.getContext('webgl');

if (!gl) {
  throw new Error('WebGL not supported');
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

// Set clear color to black, fully opaque
gl.clearColor(0.0, 0.0, 0.0, 1.0);
// Clear the color buffer with specified clear color
gl.clear(gl.COLOR_BUFFER_BIT);
    `,
  },
  // Add more steps as needed
];

export default function GettingStartedWithWebGLPage() {
  const [code, setCode] = useState(tutorialSteps[0].code);
  const [currentStep, setCurrentStep] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setCode(tutorialSteps[currentStep].code);
  }, [currentStep]);

  const handleCodeChange = (newCode: string | undefined) => {
    setCode(newCode || '');
    setError(null);  // Clear previous errors
  };

  const handleStepChange = (step: number) => {
    setCurrentStep(step);
    setCode(tutorialSteps[step].code);
    setError(null);  // Clear previous errors
  };

  return (
    <>
      <Header />
      <main className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">Getting Started with WebGL</h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div>
            <TutorialContent />
            <StepGuide 
              steps={tutorialSteps}
              currentStep={currentStep}
              onStepChange={handleStepChange}
            />
          </div>
          <div>
            <h2 className="text-2xl font-semibold mb-4">Interactive WebGL</h2>
            <MonacoEditor
              height="400px"
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
            <div className="mt-4">
              <WebGLRenderer code={code} onError={setError} />
              {error && (
                <div className="mt-2 p-2 bg-red-100 border border-red-400 text-red-700 rounded">
                  Error: {error}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}