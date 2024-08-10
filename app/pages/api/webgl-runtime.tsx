import { NextApiRequest, NextApiResponse } from 'next';

export default (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'POST') {
    const { code } = req.body;

    // Respond with HTML content that includes the WebGL code and console handling
    res.setHeader('Content-Type', 'text/html');
    res.status(200).send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>WebGL Output</title>
        <style>
          body { margin: 0; padding: 0; font-family: Arial, sans-serif; }
          #console-log { color: white; background-color: black; padding: 10px; font-family: monospace; white-space: pre; overflow-y: auto; max-height: 50vh; }
          #error-message { color: red; font-family: monospace; white-space: pre; margin-top: 10px; }
        </style>
      </head>
      <body>
        <canvas id="webgl-canvas" style="width: 100%; height: 50vh;"></canvas>
        <div id="console-log"></div>
        <pre id="error-message"></pre>
        <script>
          (function() {
            const canvas = document.getElementById('webgl-canvas');
            const consoleLog = document.getElementById('console-log');
            const errorMessage = document.getElementById('error-message');
            const gl = canvas.getContext('webgl');

            if (!gl) {
              errorMessage.textContent = 'WebGL not supported in this browser.';
              return;
            }

            // Override console.log and console.error to display in the iframe
            const originalConsoleLog = console.log;
            console.log = function(...args) {
              originalConsoleLog.apply(console, args);
              const message = args.join(' ');
              consoleLog.textContent += message + '\\n';
            };

            const originalConsoleError = console.error;
            console.error = function(...args) {
              originalConsoleError.apply(console, args);
              const message = 'Error: ' + args.join(' ');
              consoleLog.textContent += message + '\\n';
              errorMessage.textContent = message;
            };

            try {
              // Execute the WebGL code sent from the client
              ${code}
            } catch (error) {
              console.error('Error executing WebGL code:', error);
              errorMessage.textContent = 'Error executing WebGL code:\\n' + error.toString();
            }
          })();
        </script>
      </body>
      </html>
    `);
  } else {
    res.status(405).end(); // Method Not Allowed
  }
};
