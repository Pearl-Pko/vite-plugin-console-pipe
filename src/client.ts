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
            sendLogsToServer(method, ...args);
            originalMethod.apply(console, [...args]);
        };
    });
};

const sendLogsToServer = (type: ConsoleLevel, ...args: any[]) => {
    const data: ConsolePipeEvent = { type: type, data: args };

    if (connected) import.meta.hot?.send('console-pipe:log', data);
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
