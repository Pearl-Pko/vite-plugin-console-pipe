import { Plugin } from 'vite';
import fs from 'fs/promises';
import { transform } from 'esbuild';
import { LogEvent } from './type';
import { SourceMap } from 'rollup';
import { SourceMapConsumer } from 'source-map';
import path from 'path';
import { fileURLToPath } from 'url';

async function getClientFilePath() {
    const dirname = path.dirname(fileURLToPath(import.meta.url));

    const tsPath = path.join(dirname, 'client.ts');
    const jsPath = path.join(dirname, 'client.js');

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

async function processValue(
    value: unknown,
    getSourceMap: (
        id: string
    ) => SourceMap | undefined | null | { mappings: '' }
): Promise<unknown> {
    // Handle Error objects with stack traces - format as plain string
    if (
        value &&
        typeof value === 'object' &&
        '__type' in value &&
        value.__type === 'Error'
    ) {
        const errorObj = value as {
            __type: string;
            name: string;
            message: string;
            stack?: string;
        };
        let output = `${errorObj.name}: ${errorObj.message}`;
        if (errorObj.stack) {
            const mappedStack = await mapStackTrace(
                errorObj.stack,
                getSourceMap
            );
            output += `\n${mappedStack}`;
        }
        return output;
    }

    // Handle arrays - recursively process items
    if (Array.isArray(value)) {
        return Promise.all(
            value.map((item) => processValue(item, getSourceMap))
        );
    }

    // Handle plain objects - recursively process properties
    if (value && typeof value === 'object') {
        const obj = value as Record<string, unknown>;
        const processed: Record<string, unknown> = {};
        for (const key in obj) {
            if (Object.prototype.hasOwnProperty.call(obj, key)) {
                processed[key] = await processValue(obj[key], getSourceMap);
            }
        }
        return processed;
    }

    return value;
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
                    const getSourceMap = (id: string) =>
                        server.moduleGraph.getModuleById(id)?.transformResult
                            ?.map;

                    if (args.type === 'unhandled-error') {
                        let output = `Unhandled Error: ${args.message}`;
                        if (args.stack) {
                            output += `\nStack Trace:\n${args.stack}`;
                        }

                        output = await mapStackTrace(output, getSourceMap);

                        console.error(output);
                    } else {
                        // Process all arguments to map any Error objects with stack traces
                        const processedData = await Promise.all(
                            args.data.map((item) =>
                                processValue(item, getSourceMap)
                            )
                        );
                        console[args.type](...processedData);
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
                        injectTo: 'head-prepend',
                    },
                ],
            };
        },
    };
}
