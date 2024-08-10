import React, { useEffect, useRef } from 'react';

interface WebGLRendererProps {
  code: string;
  onError: (error: string) => void;
  onOutput: (output: string) => void;
  shouldRun: boolean;
}

export default function WebGLRenderer({ code, onError, onOutput, shouldRun }: WebGLRendererProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (canvasRef.current && shouldRun) {
      const canvas = canvasRef.current;
      const gl = canvas.getContext('webgl');

      if (!gl) {
        onError('WebGL not supported');
        return;
      }

      let output = '';

      const virtualConsole = {
        log: (...args: any[]) => {
          output += args.join(' ') + '\n';
        },
        error: (...args: any[]) => {
          output += 'Error: ' + args.join(' ') + '\n';
          onError(output); // Pass the error directly
        }
      };

      try {
        // Execute the provided WebGL code within a safe environment
        new Function('gl', 'console', code)(gl, virtualConsole);
        
        onOutput(output); // Pass the output back to the parent component
      } catch (error) {
        onError(error instanceof Error ? error.message : String(error));
      }
    }
  }, [code, onError, onOutput, shouldRun]);

  return <canvas ref={canvasRef} width={400} height={300} className="w-full h-full border border-gray-300 rounded" />;
}
