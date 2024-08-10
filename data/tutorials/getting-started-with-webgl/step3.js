const canvas = document.getElementById('webgl-canvas');
const gl = canvas.getContext('webgl');

if (!gl) {
  console.error('Unable to initialize WebGL. Your browser may not support it.');
}

// Vertex shader program
const vsSource = `
  attribute vec4 aVertexPosition;
  attribute vec4 aVertexColor;
  varying lowp vec4 vColor;
  void main() {
    gl_Position = aVertexPosition;
    vColor = aVertexColor;
  }
`;

// Fragment shader program
const fsSource = `
  varying lowp vec4 vColor;
  void main() {
    gl_FragColor = vColor;
  }
`;

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
}

// Set up the vertex data
const vertices = [
   0.0,  0.5,
  -0.5, -0.5,
   0.5, -0.5
];

const colors = [
  1.0, 0.0, 0.0, 1.0,  // red
  0.0, 1.0, 0.0, 1.0,  // green
  0.0, 0.0, 1.0, 1.0   // blue
];

const vertexBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

const colorBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);

const aVertexPosition = gl.getAttribLocation(shaderProgram, 'aVertexPosition');
const aVertexColor = gl.getAttribLocation(shaderProgram, 'aVertexColor');

// Render the scene
gl.clearColor(0.0, 0.0, 0.0, 1.0);
gl.clear(gl.COLOR_BUFFER_BIT);

gl.useProgram(shaderProgram);

gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
gl.vertexAttribPointer(aVertexPosition, 2, gl.FLOAT, false, 0, 0);
gl.enableVertexAttribArray(aVertexPosition);

gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
gl.vertexAttribPointer(aVertexColor, 4, gl.FLOAT, false, 0, 0);
gl.enableVertexAttribArray(aVertexColor);

gl.drawArrays(gl.TRIANGLES, 0, 3);

console.log('Colorful triangle drawn!');