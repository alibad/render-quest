## Animate the Triangle

In this final step, we'll add animation to our colorful triangle. We'll rotate the triangle continuously, introducing the concept of uniform variables and matrix transformations in WebGL.

1. We'll modify the vertex shader to include a rotation matrix.
2. We'll add a uniform variable to pass the rotation angle to the shader.
3. In our JavaScript code, we'll set up an animation loop using `requestAnimationFrame`.
4. We'll update the rotation angle and re-render the scene in each frame.

Run the code to see the colorful triangle rotating on the canvas!

Key Concepts:
- Uniform Variables: Pass changing data to shaders
- Matrix Transformations: Use matrices for rotating, scaling, and translating
- Animation Loop: Continuously update and re-render the scene
- `requestAnimationFrame`: Sync animations with the browser's refresh rate