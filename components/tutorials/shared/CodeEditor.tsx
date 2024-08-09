// File: components/tutorials/shared/CodeEditor.tsx

import React from 'react';

interface CodeEditorProps {
  code: string;
  onChange: (newCode: string) => void;
}

export default function CodeEditor({ code, onChange }: CodeEditorProps) {
  return (
    <textarea
      value={code}
      onChange={(e) => onChange(e.target.value)}
      className="w-full h-64 p-2 border border-gray-300 rounded"
    />
  );
}