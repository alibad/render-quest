## Draw a Colorful Triangle

In this step, we'll expand on our previous work to draw a colorful triangle. We'll modify our shaders to handle color data and create a triangle with different colors for each vertex.

1. We'll update the vertex shader to accept color data and pass it to the fragment shader.
2. The fragment shader will be modified to use the interpolated color data.
3. We'll create vertex data for a triangle, including position and color information.
4. Finally, we'll draw the triangle using the new shader program and data.

Run the code to see a colorful triangle appear on the canvas!

Key Concepts:
- Vertex Colors: Assigning colors to individual vertices
- Color Interpolation: WebGL automatically interpolates colors between vertices
- Multiple Attributes: Using separate attributes for position and color data