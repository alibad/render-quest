// pages/webgl-runtime.tsx

import { useEffect, useRef, useState } from 'react';

export default function WebGLRuntime() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [code, setCode] = useState<string | null>(null);

  useEffect(() => {
    // Fetch the code when the component mounts
    fetch('/api/webgl-runtime', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ code: window.location.hash.slice(1) }),
    })
      .then(response => response.json())
      .then(data => setCode(data.code))
      .catch(error => console.error('Error fetching code:', error));
  }, []);

  useEffect(() => {
    if (canvasRef.current && code) {
      const canvas = canvasRef.current;
      const gl = canvas.getContext('webgl');

      if (!gl) {
        console.error('WebGL not supported');
        return;
      }

      try {
        new Function('gl', 'canvas', code)(gl, canvas);
      } catch (error) {
        console.error('Error executing WebGL code:', error);
      }
    }
  }, [code]);

  return (
    <div style={{ width: '100%', height: '100vh', overflow: 'hidden' }}>
      <canvas ref={canvasRef} width={400} height={300} style={{ width: '100%', height: '100%' }} />
    </div>
  );
}