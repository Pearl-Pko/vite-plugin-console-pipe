console.log('Hello, Vite!');

document.getElementById('root')!.innerHTML =
    '<p>Welcome to the minimal Vite project!</p>';

let connected = false;

const wrapConsole = () => {
    const consoleMethods : ConsoleLevel[] = ['log', 'error', 'warn', 'info', 'debug'];

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
    if (connected)
        import.meta.hot?.send('console-pipe:log', data);
};

const bootstrap = () => {
    import.meta.hot?.on('vite:ws:connect', () => {
        connected = true;
        console.log("connecteddd");
    });

    import.meta.hot?.on('vite:ws:disconnect', () => {
        connected = false;
        console.log("disconnectedddd");
    });

}

bootstrap();

wrapConsole();

const test = () => {
    console.log('test');
    console.debug('ds');
};

test();


