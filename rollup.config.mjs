import typescript from '@rollup/plugin-typescript';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import copy from 'rollup-plugin-copy';
import terser from '@rollup/plugin-terser';

export default [
    {
        input: `src/index.ts`,
        output: [
            {
                file: `./dist/index.js`,
                format: 'es',
            },
        ],
        plugins: [typescript(), copy({ targets: [{ src: './node_modules/rustpotter-web-slim/rustpotter_wasm_bg.wasm', dest: './dist' }] })],
        external: ['rustpotter-web-slim'],
    },
    {
        input: `src/rustpotter-worklet.ts`,
        output: [
            {
                file: `./dist/rustpotter-worklet.js`,
                format: 'es',
            },
            {
                file: `./dist/rustpotter-worklet.min.js`,
                format: 'es',
                plugins: [terser()]
            },
        ],
        plugins: [typescript(), nodeResolve()],
    },
    {
        input: `src/rustpotter-worker.ts`,
        output: [
            {
                file: `./dist/rustpotter-worker.js`,
                format: 'es',
            },
            {
                file: `./dist/rustpotter-worker.min.js`,
                format: 'es',
                plugins: [terser()]
            },
        ],
        plugins: [typescript(), nodeResolve()],
    },
];