// Get the WebGL context
const gl = canvas.getContext('webgl');

if (!gl) {
  console.error('Unable to initialize WebGL. Your browser may not support it.');
  return;
}

// Set clear color to red, fully opaque
gl.clearColor(1.0, 0.0, 0.0, 1.0);

// Clear the color buffer with specified clear color
gl.clear(gl.COLOR_BUFFER_BIT);

console.log('WebGL context initialized successfully!');