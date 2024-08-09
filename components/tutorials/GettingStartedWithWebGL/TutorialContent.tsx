// File: components/tutorials/GettingStartedWithWebGL/TutorialContent.tsx

import React from 'react';

export default function TutorialContent() {
  return (
    <div>
      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">What is WebGL?</h2>
        <p>WebGL (Web Graphics Library) is a JavaScript API for rendering interactive 2D and 3D graphics within any compatible web browser without the use of plug-ins.</p>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Key Concepts</h2>
        <ul className="list-disc list-inside">
          <li>WebGL Context</li>
          <li>Shaders (Vertex and Fragment)</li>
          <li>Buffers</li>
          <li>Attributes and Uniforms</li>
        </ul>
      </section>

      {/* Add more sections as needed */}
    </div>
  );
}