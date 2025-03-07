import { Plugin } from 'vite';
import fs from 'fs/promises';
import { transform } from 'esbuild';

async function getClientFilePath() {
    const tsPath = new URL('./client.ts', import.meta.url);
    const jsPath = new URL('./client.js', import.meta.url);

    try {
        await fs.access(tsPath); // Check if TypeScript file exists
        return tsPath;
    } catch {
        return jsPath; // If not, use JavaScript file
    }
}

export default function consolePipe(): Plugin {
    return {
        name: 'console-pipe',
        async load(id) {
            if (id === '/@console-pipe/client') {
                try {
                    const clientScript = await fs.readFile(
                        await getClientFilePath(),
                        'utf-8'
                    );
                    // return clientScript;
                    return await transform(clientScript, {
                        loader: 'ts',
                        format: 'esm',
                        target: 'esnext',

                        sourcemap: true,
                    });
                } catch (error) {
                    console.error('Failed to load client file', error);
                    return null;
                }
            }
        },

        configureServer(server) {
            return () =>
                server.ws.on('console-pipe:log', (args: ConsolePipeEvent) => {
                    console.log(...args.data);
                });
        },
        transformIndexHtml(html) {
            return {
                html: html,
                tags: [
                    {
                        tag: 'script',
                        attrs: {
                            src: '@console-pipe/client',
                            type: 'module',
                        },
                        injectTo: 'head',
                    },
                ],
            };
        },
    };
}
