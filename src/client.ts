import { ConsoleLevel, LogEvent } from './type';

let connected = false;
let queue: LogEvent[] = [];
let flushing = false;

function safeSerialize(value: unknown, seen = new WeakSet()): unknown {
    // Handle primitives
    if (value === null) return null;
    if (value === undefined) return undefined;
    if (typeof value === 'string') return value;
    if (typeof value === 'number') {
        if (isNaN(value)) return 'NaN';
        if (!isFinite(value)) return value > 0 ? 'Infinity' : '-Infinity';
        return value;
    }
    if (typeof value === 'boolean') return value;
    if (typeof value === 'bigint') return `${value}n`;
    if (typeof value === 'symbol') return value.toString();
    if (typeof value === 'function')
        return `[Function: ${value.name || 'anonymous'}]`;

    // Handle circular references
    if (typeof value === 'object' && seen.has(value)) {
        return '[Circular]';
    }

    // Handle arrays
    if (Array.isArray(value)) {
        seen.add(value);
        return value.map((item) => safeSerialize(item, seen));
    }

    // Handle Dates
    if (value instanceof Date) {
        return value.toISOString();
    }

    // Handle Errors
    if (value instanceof Error) {
        return {
            __type: 'Error',
            name: value.name,
            message: value.message,
            stack: value.stack,
        };
    }

    // Handle RegExp
    if (value instanceof RegExp) {
        return value.toString();
    }

    // Handle Maps
    if (value instanceof Map) {
        const obj: Record<string, unknown> = {};
        value.forEach((val, key) => {
            obj[String(key)] = safeSerialize(val, seen);
        });
        return { __type: 'Map', entries: obj };
    }

    // Handle Sets
    if (value instanceof Set) {
        return {
            __type: 'Set',
            values: Array.from(value).map((item) => safeSerialize(item, seen)),
        };
    }

    // Handle DOM nodes
    if (typeof HTMLElement !== 'undefined' && value instanceof HTMLElement) {
        return `[${value.tagName.toLowerCase()}${value.id ? `#${value.id}` : ''}${value.className ? `.${value.className.split(' ').join('.')}` : ''}]`;
    }

    // Handle plain objects
    if (Object.prototype.toString.call(value) === '[object Object]') {
        seen.add(value);
        const obj: Record<string, unknown> = {};
        const objValue = value as Record<string, unknown>;
        for (const key in objValue) {
            if (Object.prototype.hasOwnProperty.call(objValue, key)) {
                try {
                    obj[key] = safeSerialize(objValue[key], seen);
                } catch {
                    obj[key] = '[Unserializable]';
                }
            }
        }
        return obj;
    }

    // Fallback for other types
    try {
        return String(value);
    } catch {
        return '[Unserializable]';
    }
}

function enqueue(event: LogEvent) {
    // Serialize the data before queueing
    let serializedEvent: LogEvent;
    if (event.type === 'unhandled-error') {
        serializedEvent = event;
    } else {
        serializedEvent = {
            ...event,
            data: event.data.map((item) => safeSerialize(item)),
        };
    }
    queue = [...queue, serializedEvent];
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
