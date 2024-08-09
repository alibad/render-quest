// File: components/tutorials/GettingStartedWithWebGL/StepByStepGuide.tsx

import React from 'react';
import { Button } from '@/components/shared/ui/button';

interface StepByStepGuideProps {
  currentStep: number;
  onStepChange: (step: number) => void;
  onCodeChange: (code: string) => void;
}

const steps = [
  {
    title: "Set up the WebGL context",
    code: `
const canvas = document.getElementById('webgl-canvas');
const gl = canvas.getContext('webgl');

if (!gl) {
  console.error('WebGL not supported');
  return;
}
    `,
  },
  {
    title: "Create shaders",
    code: `
// Previous code...

const vertexShaderSource = \`
  attribute vec4 a_position;
  void main() {
    gl_Position = a_position;
  }
\`;

const fragmentShaderSource = \`
  precision mediump float;
  void main() {
    gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);
  }
\`;

function createShader(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  return shader;
}

const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
    `,
  },
  // Add more steps as needed
];

export default function StepByStepGuide({ currentStep, onStepChange, onCodeChange }: StepByStepGuideProps) {
  return (
    <div>
      <h3 className="text-xl font-semibold mb-4">Step {currentStep + 1}: {steps[currentStep].title}</h3>
      <pre className="bg-gray-100 p-4 rounded-md overflow-x-auto mb-4">
        <code>{steps[currentStep].code}</code>
      </pre>
      <Button onClick={() => {
        onCodeChange(steps[currentStep].code);
        if (currentStep < steps.length - 1) {
          onStepChange(currentStep + 1);
        }
      }}>
        {currentStep < steps.length - 1 ? "Next Step" : "Finish"}
      </Button>
    </div>
  );
}