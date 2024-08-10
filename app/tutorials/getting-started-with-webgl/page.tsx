'use client';

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/shared/ui/button';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import tutorialData from '@/data/tutorials/getting-started-with-webgl.json';
import WebGLRenderer from '@/components/tutorials/shared/WebGLRenderer';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/shared/ui/tabs';

const MonacoEditor = dynamic(() => import('@monaco-editor/react'), { ssr: false });

export default function GettingStartedWithWebGLPage() {
  const [currentView, setCurrentView] = useState<'intro' | 'tutorial' | 'final'>('intro');
  const [code, setCode] = useState(tutorialData.tutorialSteps[0].code);
  const [currentStep, setCurrentStep] = useState(0);
  const [leftTab, setLeftTab] = useState<'instructions' | 'source-code'>('instructions');
  const [lastCodeRun, setLastCodeRun] = useState(Date.now());

  const runCode = () => {
    setLastCodeRun(Date.now());
  };

  const handleCodeChange = (newCode: string | undefined) => {
    setCode(newCode || '');
  };

  const handleStepChange = (step: number) => {
    setCurrentStep(step);
    setCode(tutorialData.tutorialSteps[step]?.code || '');
  };

  const startTutorial = () => {
    setCurrentView('tutorial');
    setCurrentStep(0);
    setCode(tutorialData.tutorialSteps[0].code);
  };

  const restartTutorial = () => {
    setCurrentView('intro');
    setCurrentStep(0);
    setCode(tutorialData.tutorialSteps[0].code);
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className={`flex-grow container mx-auto px-4 py-8 ${currentView === 'intro' ? 'flex items-center justify-center' : ''}`}>
        {currentView === 'intro' ? (
          <div className="max-w-2xl mx-auto">
            <div className="prose dark:prose-invert max-w-none">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeRaw]}
              >
                {tutorialData.introContent}
              </ReactMarkdown>
            </div>
            <Button onClick={startTutorial} className="mt-8">Start Tutorial</Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-4">
              <Tabs value={leftTab} onValueChange={(value) => setLeftTab(value as 'instructions' | 'source-code')}>
                <TabsList>
                  <TabsTrigger value="instructions">Instructions</TabsTrigger>
                  <TabsTrigger value="source-code">Source Code</TabsTrigger>
                </TabsList>
                <TabsContent value="instructions">
                  <div className="prose dark:prose-invert max-w-none">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      rehypePlugins={[rehypeRaw]}
                    >
                      {tutorialData.tutorialSteps[currentStep]?.instructions || ''}
                    </ReactMarkdown>
                  </div>
                  <div className="flex justify-between mt-4">
                    <Button
                      onClick={() => handleStepChange(Math.max(0, currentStep - 1))}
                      disabled={currentStep === 0}
                    >
                      Previous
                    </Button>
                    <Button
                      onClick={() => handleStepChange(Math.min(tutorialData.tutorialSteps.length, currentStep + 1))}
                      disabled={currentStep === tutorialData.tutorialSteps.length}
                    >
                      Next
                    </Button>
                  </div>
                </TabsContent>
                <TabsContent value="source-code">
                  <div className="h-[calc(100vh-300px)] border border-gray-300 rounded">
                    <MonacoEditor
                      height="100%"
                      language="javascript"
                      theme="vs-dark"
                      value={code}
                      onChange={handleCodeChange}
                      options={{
                        minimap: { enabled: false },
                        scrollBeyondLastLine: false,
                        fontSize: 14,
                      }}
                    />
                  </div>
                  <div className="flex justify-between mt-4">
                    <Button onClick={runCode}>Run Code</Button>
                    <Button onClick={restartTutorial}>Restart Tutorial</Button>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
            <WebGLRenderer code={code} key={lastCodeRun}  />
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
