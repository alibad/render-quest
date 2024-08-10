'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useToast } from '@/components/shared/ui/use-toast';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/shared/ui/tabs';

export default function WebGLRenderer({ code }: { code: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [consoleLogs, setConsoleLogs] = useState<string[]>([]);
  const [rightTab, setRightTab] = useState<'webgl' | 'console'>('webgl');
  const { toast } = useToast();

  const addConsoleLog = useCallback((type: 'log' | 'error', ...args: any[]) => {
    const timestamp = new Date().toLocaleTimeString();
    const message = args.map(arg => 
      typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
    ).join(' ');
    setConsoleLogs(prevLogs => [...prevLogs, `${timestamp}: ${type.toUpperCase()}: ${message}`]);

    if (type === 'error') {
      toast({ title: 'Error', description: message, variant: 'destructive' });
      setRightTab('console');
    }
  }, [toast]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext('webgl');
    if (!gl) {
      addConsoleLog('error', 'WebGL not supported in this browser.');
      return;
    }

    setConsoleLogs([]);

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

    try {
      gl.clearColor(0.0, 0.0, 0.0, 1.0);
      gl.clear(gl.COLOR_BUFFER_BIT);

      eval(code);
      toast({ title: 'Success!', description: 'Code executed successfully.', variant: 'default' });
    } catch (error) {
      console.error('Error executing WebGL code:', error);
      toast({ title: 'Error', description: 'There was an error executing your code. See the console logs for details.', variant: 'destructive' });
    }

    return () => {
      console.log = originalConsoleLog;
      console.error = originalConsoleError;
    };
  }, [code, addConsoleLog, toast]);

  return (
    <div className="space-y-4">
      <Tabs value={rightTab} onValueChange={(value) => setRightTab(value as 'webgl' | 'console')}>
        <TabsList>
          <TabsTrigger value="webgl">WebGL Output</TabsTrigger>
          <TabsTrigger value="console">Console Logs</TabsTrigger>
        </TabsList>
        <TabsContent value="webgl">
          <canvas ref={canvasRef} id="webgl-canvas" width="640" height="480" className="border border-gray-300 rounded"></canvas>
        </TabsContent>
        <TabsContent value="console">
          <div id="console-log" className="h-[calc(100vh-300px)] border border-gray-300 rounded overflow-auto p-4 bg-gray-100 font-mono text-sm">
            {consoleLogs.map((log, index) => (
              <div key={index} className={log.includes('ERROR') ? 'text-red-600' : 'text-gray-800'}>
                {log}
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
