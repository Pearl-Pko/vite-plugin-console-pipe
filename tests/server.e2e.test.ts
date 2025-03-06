import { createServer, ViteDevServer } from 'vite';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import consolePipe from '../src';
import { Browser, chromium, Page } from 'playwright';

let server: ViteDevServer;
let browser: Browser;
let page: Page;

describe('Server', () => {
    let resolveLogPromise: (value: unknown) => void;
    let logPromise: Promise<unknown>;
    const originalConsoleLog = console.log;

    beforeAll(async () => {
        logPromise = new Promise((resolve) => {
            resolveLogPromise = resolve;
        });
        console.log = (...args: any[]) => {
            if (args?.[0] === 'Test log message') {
                resolveLogPromise(true);
            }

            originalConsoleLog.apply(console, [...args]);
        };

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
            headless: process.env.CI ? true : false,
        }); // Use headed mode for debugging
        page = await browser.newPage();
    });

    afterAll(async () => {
        await browser.close();
        await server?.close();
    });

    it('should inject the client script into the HTML', async () => {
        await page.goto('http://localhost:4000');

        // Verify the client script is injected
        const scriptSrc = await page.$eval(
            'script[src="@console-pipe/client.ts"]',
            (el: HTMLScriptElement) => el.src
        );
        expect(scriptSrc).toContain('@console-pipe/client.ts');
    });

    it("should forward the logs in the client to the vite dev server", async() => {
        await page.goto('http://localhost:4000');


         // Simulate a console.log call in the browser
         await page.evaluate(() => {
            console.log('Test log message');
        });

        // Wait for the server to receive the log message
        await Promise.all([await logPromise]);

        expect(true).toBe(true);

    })
});
