import { ConsoleLevel, LogEvent } from './type';

let connected = false;

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
            sendLogsToServer({ type: method, data: args });
            originalMethod.apply(console, [...args]);
        };
    });

    window.addEventListener('error', (event: ErrorEvent) => {
        sendLogsToServer({
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

            sendLogsToServer({
                type: 'unhandled-error',
                message: error.message,
                stack: error.stack,
            });
        }
    );
};

const sendLogsToServer = (event: LogEvent) => {
    if (connected) import.meta.hot?.send('console-pipe:log', event);
};

const bootstrap = () => {
    import.meta.hot?.on('vite:ws:connect', () => {
        connected = true;
    });

    import.meta.hot?.on('vite:ws:disconnect', () => {
        connected = false;
    });
};

bootstrap();

wrapConsole();
