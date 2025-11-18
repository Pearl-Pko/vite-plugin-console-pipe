import { createServer, ViteDevServer } from 'vite';
import {
    afterAll,
    afterEach,
    beforeAll,
    describe,
    expect,
    it,
    vi,
} from 'vitest';
import consolePipe from '../src';
import { Browser, chromium } from 'playwright';

let server: ViteDevServer;
let browser: Browser;

describe('Server', () => {
    const logMock = vi.fn();
    const errorMock = vi.fn();

    beforeAll(async () => {
        vi.stubGlobal('console', {
            ...console,
            log: logMock,
            error: errorMock,
        });

        server = await createServer({
            plugins: [consolePipe()],
            server: {
                port: 4000,
            },
            root: './tests',
        });

        await server.listen(4000);

        // Launch a browser
        browser = await chromium.launch({
            headless: true,
        }); // Use headed mode for debugging
    });

    afterAll(async () => {
        await browser.close();
        await server?.close();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('should inject the client script into the HTML', async () => {
        const page = await browser.newPage();
        await page.goto('http://localhost:4000');

        // Verify the client script is injected
        const scriptSrc = await page.$eval(
            'script[src="@console-pipe/client"]',
            (el: HTMLScriptElement) => el.src
        );
        expect(scriptSrc).toContain('@console-pipe/client');
    });

    it('should forward the logs in the client to the vite dev server', async () => {
        const page = await browser.newPage();
        await page.goto('http://localhost:4000');

        // Simulate a console.log call in the browser
        await page.evaluate(() => {
            console.log('Test log message');
        });

        expect(logMock).toHaveBeenCalledWith('Test log message');
    });

    it('should forward the unhandled exceptions in the client to the vite dev server', async () => {
        const page = await browser.newPage();

        await page.goto('http://localhost:4000');

        // Simulate a console.log call in the browser
        await page.evaluate(() => {
            return new Promise<void>((resolve) => {
                setTimeout(() => {
                    try {
                        throw new Error('Test unhandled error');
                    } finally {
                        resolve();
                    }
                }, 0);
            });
        });

        expect(errorMock).toHaveBeenCalledWith(
            expect.stringContaining('Unhandled Error: Test unhandled error')
        );
    });

    it('should send buffered logs when the connection is re-established', async () => {
        const page = await browser.newPage();
        let allowHmrConnection: ((args: any) => void) | undefined;

        // Pause the websocket connection
        await page.routeWebSocket('ws://localhost:4000/*', async (ws) => {
            await new Promise((resolve) => {
                allowHmrConnection = resolve;
            });
            ws.connectToServer();
        });

        await page.goto('http://localhost:4000');

        // Log messages while disconnected
        await page.evaluate(() => {
            console.log('Buffered log 1');
        });

        allowHmrConnection?.(true);

        // Wait a bit to allow the log to be sent after reconnection
        await new Promise((resolve) => setTimeout(resolve, 100));

        expect(logMock).toHaveBeenCalledWith('Buffered log 1');
    });
});
