import { Plugin } from 'vite';
import fs from 'fs/promises';
import { transform } from 'esbuild';
import { LogEvent } from './type';
import { SourceMap } from 'rollup';
import { SourceMapConsumer } from 'source-map';
import path from 'path';

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

async function mapStackTrace(
    stack: string,
    getSourceMap: (id: string) =>
        | SourceMap
        | undefined
        | null
        | {
              mappings: '';
          }
): Promise<string> {
    const lines = stack.split('\n');

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const match = line.match(
            /https?:\/\/.+:(?<port>\d+)\/(?<file>.+):(?<line_number>\d+):(?<column>\d+)/
        );

        if (!match?.groups?.file) {
            continue; // No match, skip to next line
        }

        const key = path.resolve(match?.groups.file).replace(/\\/g, '/');
        const map = getSourceMap(key);
        if (!map) {
            continue; // No source map available
        }

        const consumer = await new SourceMapConsumer(map as SourceMap);

        const genLine = Number(match.groups.line_number);
        const genColumn = Number(match.groups.column);

        const originalPosition = consumer.originalPositionFor({
            line: genLine,
            column: genColumn,
        });

        consumer.destroy();

        if (!originalPosition.source) {
            continue; // No original position found
        }

        lines[i] = line.replace(
            /https?:\/\/.+:(?<port>\d+)\/(?<file>.+):(?<line_number>\d+):(?<column>\d+)/,
            `${originalPosition.source}:${originalPosition.line}:${originalPosition.column}`
        );
    }
    return lines.join('\n');
}

export default function consolePipe(): Plugin {
    return {
        name: 'console-pipe',
        apply: 'serve',
        async load(id) {
            if (id === '/@console-pipe/client') {
                try {
                    const clientScript = await fs.readFile(
                        await getClientFilePath(),
                        'utf-8'
                    );
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
            return () => {
                server.ws.on('console-pipe:log', async (args: LogEvent) => {
                    if (args.type === 'unhandled-error') {
                        let output = `Unhandled Error: ${args.message}`;
                        if (args.stack) {
                            output += `\nStack Trace:\n${args.stack}`;
                        }

                        output = await mapStackTrace(output, (id: string) => {
                            const map =
                                server.moduleGraph.getModuleById(id)
                                    ?.transformResult?.map;
                            return map;
                        });

                        console.error(output);
                    } else {
                        console[args.type](...args.data);
                    }
                });
            };
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
                            crossorigin: 'anonymous',
                        },
                        injectTo: 'head',
                    },
                ],
            };
        },
    };
}
