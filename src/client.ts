import { ConsoleLevel, LogEvent } from './type';

let connected = false;
let queue: LogEvent[] = [];
let flushing = false;

function enqueue(event: LogEvent) {
    queue = [...queue, event];
    flush();
}

function flush() {
    if (!connected) return;
    if (flushing) return;

    flushing = true;

    try {
        while (connected && queue.length > 0) {
            const event = queue[0];
            queue = queue.slice(1);
            import.meta.hot?.send('console-pipe:log', event);
        }
    } finally {
        flushing = false;
    }
}

const wrapConsole = () => {
    const consoleMethods: ConsoleLevel[] = [
        'log',
        'error',
        'warn',
        'info',
        'debug',
    ];

    consoleMethods.forEach((method) => {
        const originalMethod = console[method];

        console[method] = function (...args: any[]) {
            enqueue({ type: method, data: args });
            originalMethod.apply(console, [...args]);
        };
    });

    window.addEventListener('error', (event: ErrorEvent) => {
        enqueue({
            type: 'unhandled-error',
            message: event.error?.message,
            stack: event.error?.stack,
        });
    });

    window.addEventListener(
        'unhandledrejection',
        (event: PromiseRejectionEvent) => {
            // event.reason contains the rejection value (usually an Error)
            const error =
                event.reason instanceof Error
                    ? event.reason
                    : new Error(String(event.reason));

            enqueue({
                type: 'unhandled-error',
                message: error.message,
                stack: error.stack,
            });
        }
    );
};

const bootstrap = () => {
    import.meta.hot?.on('vite:ws:connect', () => {
        connected = true;
        flush();
    });

    import.meta.hot?.on('vite:ws:disconnect', () => {
        connected = false;
    });
};

bootstrap();

wrapConsole();
