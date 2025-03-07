import { defineConfig } from 'tsup';

export default defineConfig([
    {
        entry: ['src/index.ts'],
        format: ['esm', 'cjs'],
        dts: true,
        sourcemap: true,
        clean: true,
        minify: false,
    },
    {
        entry: ['src/client.ts'],
        format: ['esm'],
        dts: true,
        sourcemap: true,
        clean: true,
        minify: true,
    },
]);
