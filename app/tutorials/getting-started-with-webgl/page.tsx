'use client';

import React, { useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/shared/ui/button';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import tutorialData from '@/data/tutorials/getting-started-with-webgl.json'; // Import the JSON data

// Importing Tabs and Toast components from your shared UI components
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/shared/ui/tabs';
import { useToast } from '@/components/shared/ui/use-toast';
import { Toaster } from '@/components/shared/ui/toaster';

const MonacoEditor = dynamic(() => import('@monaco-editor/react'), { ssr: false });

export default function GettingStartedWithWebGLPage() {
  const [currentView, setCurrentView] = useState<'intro' | 'tutorial'>('intro');
  const [code, setCode] = useState(tutorialData.tutorialSteps[tutorialData.tutorialSteps.length - 1].code);
  const [currentStep, setCurrentStep] = useState(-1);
  const [iframeKey, setIframeKey] = useState(0);
  const { toast } = useToast();

  const handleCodeChange = (newCode: string | undefined) => {
    setCode(newCode || '');
  };

  const handleStepChange = (step: number) => {
    setCurrentStep(step);
    setCode(tutorialData.tutorialSteps[step].code);
    runCode(tutorialData.tutorialSteps[step].code);
  };

  const handleRunCode = useCallback(() => {
    toast({ title: 'Running Code...', description: 'Your code is being executed.', variant: 'default' });
    runCode(code);
  }, [code]);

  const runCode = (codeToRun: string) => {
    const iframe = document.getElementById('webgl-frame') as HTMLIFrameElement;

    if (iframe) {
      const form = document.createElement('form');
      form.method = 'POST';
      form.action = '/api/webgl-runtime';
      form.target = iframe.name;  // Name of the iframe
    
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = 'code';
      input.value = codeToRun;
      form.appendChild(input);
    
      document.body.appendChild(form);
      form.submit();
      document.body.removeChild(form);
    
      setIframeKey(prev => prev + 1);  // Force iframe refresh if needed
  
      toast({ title: 'Code executed successfully!', description: 'Check the output in the WebGL tab.', variant: 'default' });
    } else {
      console.error('WebGL frame not found.');
      toast({ title: 'Error', description: 'WebGL frame not found. Please try refreshing the page or checking the iframe ID.', variant: 'destructive' });
    }
  };

  const startTutorial = () => {
    setCurrentView('tutorial');
    setCurrentStep(0);
    setCode(tutorialData.tutorialSteps[0].code);
    runCode(tutorialData.tutorialSteps[0].code);
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
              <Tabs defaultValue="instructions">
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
                      {currentStep === -1
                        ? "This is the final result of the tutorial. Click 'Start Tutorial' to begin from the first step."
                        : tutorialData.tutorialSteps[currentStep].instructions}
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
                      onClick={() => handleStepChange(Math.min(tutorialData.tutorialSteps.length - 1, currentStep + 1))}
                      disabled={currentStep === tutorialData.tutorialSteps.length - 1}
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
                    <Button onClick={handleRunCode}>Run Code</Button>
                    <Button onClick={startTutorial}>Restart Tutorial</Button>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
            <div className="space-y-4">
              <Tabs defaultValue="webgl">
                <TabsList>
                  <TabsTrigger value="webgl">WebGL Output</TabsTrigger>
                  <TabsTrigger value="console">Console Logs</TabsTrigger>
                </TabsList>
                <TabsContent value="webgl">
                  <iframe 
                    name="webgl-frame" 
                    id="webgl-frame"
                    width="100%" 
                    height="100%" 
                    key={iframeKey}
                    className="border border-gray-300 rounded"
                  />
                </TabsContent>
                <TabsContent value="console">
                  <div id="console-log" className="h-[calc(100vh-300px)] border border-gray-300 rounded overflow-auto p-4">
                    {/* Console logs can be dynamically inserted here */}
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        )}
      </main>
      <Footer />
      <Toaster /> {/* Toast notifications */}
    </div>
  );
}