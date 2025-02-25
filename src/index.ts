import { Plugin } from 'vite';

export default function consolePipe(): Plugin {
    return {
        name: 'console-pipe',
        configureServer(server) {
            return () =>
                server.ws.on('console-pipe:log', (args: ConsolePipeEvent) => {
                    console.log(...args.data);
                });
        },
    };
}
