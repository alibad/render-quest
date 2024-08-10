## Create Shaders and Draw a Point

In this step, we'll create vertex and fragment shaders, which are essential for rendering in WebGL. We'll use these to draw a single white point in the center of the canvas.

1. First, we define the vertex and fragment shader programs as strings.
2. Then, we create a function to compile these shader programs.
3. We create a shader program by linking the compiled vertex and fragment shaders.
4. Finally, we set up a single vertex and draw it as a point.

Run the code to see a white point appear in the center of the canvas!

Key Concepts:
- Vertex Shaders: Process individual vertices
- Fragment Shaders: Determine the color of individual pixels
- Shader Program: Combines vertex and fragment shaders
- Buffers: Store vertex data
- Attributes: Pass data from buffers to vertex shaders