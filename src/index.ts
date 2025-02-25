import { Plugin } from 'vite';
import fs from 'fs/promises';
import { transform } from 'esbuild';

export default function consolePipe(): Plugin {
    return {
        name: 'console-pipe',
        async load(id) {
            if (id === '/@console-pipe/client.ts') {
                try {
                    const clientScript = await fs.readFile(
                        new URL('./client.ts', import.meta.url),
                        'utf-8'
                    );
                    // return clientScript;
                    return (await transform(clientScript, {
                        loader: 'ts',
                        format: 'esm',
                        target: 'esnext',

                        sourcemap: true,
                    }));
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
                            src: '@console-pipe/client.ts',
                            type: 'module',
                        },
                        injectTo: 'head',
                    },
                ],
            };
        },
    };
}
