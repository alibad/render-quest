'use client';

import { useState, useEffect, useCallback } from 'react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/shared/ui/button';
import { useToast } from '@/components/shared/ui/use-toast';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/shared/ui/tabs';
import dynamic from 'next/dynamic';

const MonacoEditor = dynamic(() => import('@monaco-editor/react'), { ssr: false });

interface TutorialStep {
  title: string;
  content: string;
  code: string;
}

interface TutorialData {
  title: string;
  description: string;
  intro: string;
  steps: TutorialStep[];
}

interface TutorialClientProps {
  tutorialData: TutorialData;
}

export function TutorialClient({ tutorialData }: TutorialClientProps) {
  const [currentView, setCurrentView] = useState<'intro' | 'tutorial'>('intro');
  const [currentStep, setCurrentStep] = useState(0);
  const [code, setCode] = useState(tutorialData.steps[0].code);
  const [consoleLogs, setConsoleLogs] = useState<string[]>([]);
  const [leftTab, setLeftTab] = useState<'instructions' | 'source-code'>('instructions');
  const [rightTab, setRightTab] = useState<'webgl' | 'console'>('webgl');
  const { toast } = useToast();

  const addConsoleLog = useCallback((type: 'log' | 'error', ...args: any[]) => {
    const timestamp = new Date().toLocaleTimeString();
    const message = args.map(arg => 
      typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
    ).join(' ');

    setConsoleLogs(prevLogs => [...prevLogs, `${type.toUpperCase()}: ${message}`]);

    if (type === 'error') {
      toast({ title: 'Error', description: message, variant: 'destructive' });
      setRightTab('console');
    }
  }, [toast]);

  useEffect(() => {
    const originalConsoleLog = console.log;
    const originalConsoleError = console.error;

    console.log = (...args) => {
      originalConsoleLog(...args);
      addConsoleLog('log', ...args);
    };

    console.error = (...args) => {
      originalConsoleError(...args);
      addConsoleLog('error', ...args);
    };

    return () => {
      console.log = originalConsoleLog;
      console.error = originalConsoleError;
    };
  }, [addConsoleLog]);

  const startTutorial = () => {
    setCurrentView('tutorial');
    setCurrentStep(0);
    setCode(tutorialData.steps[0].code);
    runStep(0);
  };

  const handleStepChange = (step: number) => {
    setCurrentStep(step);
    setCode(tutorialData.steps[step].code);
    runStep(step);
  };

  const runStep = (step: number) => {
    const canvas = document.getElementById('webgl-canvas') as HTMLCanvasElement;
    if (!canvas) return;

    // Clear previous console logs
    setConsoleLogs([]);

    toast({ title: 'Running Code...', description: 'Your code is being executed.', variant: 'default' });

    try {
      // Use new Function to create a function from the code string
      // Pass canvas as an argument to the function
      new Function('canvas', tutorialData.steps[step].code)(canvas);
      toast({ title: 'Success!', description: 'Code executed successfully.', variant: 'default' });
      setRightTab('webgl');
    } catch (error) {
      console.error('Error executing WebGL code:', error);
      toast({ title: 'Error', description: 'There was an error executing your code. See the console logs for details.', variant: 'destructive' });
      setRightTab('console');
    }
  };

  const handleCodeChange = (newCode: string | undefined) => {
    setCode(newCode || '');
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-grow container mx-auto px-4 py-8">
        {currentView === 'intro' ? (
          <div className="max-w-2xl mx-auto">
            <h1 className="text-3xl font-bold mb-4">{tutorialData.title}</h1>
            <p className="mb-4">{tutorialData.description}</p>
            <div className="prose dark:prose-invert max-w-none">
              <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
                {tutorialData.intro}
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
                    <h2 className="text-2xl font-bold">{tutorialData.steps[currentStep].title}</h2>
                    <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
                      {tutorialData.steps[currentStep].content}
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
                      onClick={() => handleStepChange(Math.min(tutorialData.steps.length - 1, currentStep + 1))}
                      disabled={currentStep === tutorialData.steps.length - 1}
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
                    <Button onClick={() => runStep(currentStep)}>Run Code</Button>
                    <Button onClick={() => setCode(tutorialData.steps[currentStep].code)}>Reset Code</Button>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
            <div className="space-y-4">
              <Tabs value={rightTab} onValueChange={(value) => setRightTab(value as 'webgl' | 'console')}>
                <TabsList>
                  <TabsTrigger value="webgl">WebGL Output</TabsTrigger>
                  <TabsTrigger value="console">Console Logs</TabsTrigger>
                </TabsList>
                <TabsContent value="webgl">
                  <canvas id="webgl-canvas" width="640" height="480" className="border border-gray-300 rounded"></canvas>
                </TabsContent>
                <TabsContent value="console">
                  <div id="console-log" className="h-[480px] border border-gray-300 rounded overflow-auto p-4 bg-gray-100 font-mono text-sm">
                    {consoleLogs.map((log, index) => (
                      <div key={index} className={log.startsWith('ERROR:') ? 'console-error' : 'console-log'}>
                        <span className="console-timestamp">{new Date().toLocaleTimeString()}: </span>{log}
                      </div>
                    ))}
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
