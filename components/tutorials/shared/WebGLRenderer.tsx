import React, { useEffect, useRef } from 'react';

interface WebGLRendererProps {
  code: string;
  onError: (error: string) => void;
}

export default function WebGLRenderer({ code, onError }: WebGLRendererProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (canvasRef.current) {
      const canvas = canvasRef.current;
      const gl = canvas.getContext('webgl');

      if (gl) {
        // Clear any previous content
        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.clearColor(0.0, 0.0, 0.0, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT);

        // Execute the user's code
        try {
          // Wrap the code in a function to avoid global scope pollution
          const wrappedCode = `
            (function() {
              const canvas = document.getElementById('webgl-canvas');
              const gl = canvas.getContext('webgl');
              ${code}
            })();
          `;
          new Function(wrappedCode)();
          onError('');  // Clear any previous errors
        } catch (error) {
          console.error('Error executing WebGL code:', error);
          onError(error instanceof Error ? error.message : String(error));
        }
      }
    }
  }, [code, onError]);

  return <canvas id="webgl-canvas" ref={canvasRef} width={400} height={300} className="border border-gray-300 rounded" />;
}