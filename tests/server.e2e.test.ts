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
import { Browser, chromium, Page } from 'playwright';

let server: ViteDevServer;
let browser: Browser;
let page: Page;

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
            headless: process.env.CI ? true : false,
        }); // Use headed mode for debugging
        page = await browser.newPage();
    });

    afterAll(async () => {
        await browser.close();
        await server?.close();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('should inject the client script into the HTML', async () => {
        await page.goto('http://localhost:4000');

        // Verify the client script is injected
        const scriptSrc = await page.$eval(
            'script[src="@console-pipe/client"]',
            (el: HTMLScriptElement) => el.src
        );
        expect(scriptSrc).toContain('@console-pipe/client');
    });

    it('should forward the logs in the client to the vite dev server', async () => {
        await page.goto('http://localhost:4000');

        // Simulate a console.log call in the browser
        await page.evaluate(() => {
            console.log('Test log message');
        });

        expect(logMock).toHaveBeenCalledWith('Test log message');
    });

    it('should forward the unhandled exceptions in the client to the vite dev server', async () => {
        await page.goto('http://localhost:4000');

        // Simulate a console.log call in the browser
        await page.evaluate(() => {
            setTimeout(() => {
                throw new Error('Test unhandled error');
            }, 0);
        });

        expect(errorMock).toHaveBeenCalledWith(
            expect.stringContaining('Unhandled Error: Test unhandled error')
        );
    });
});
