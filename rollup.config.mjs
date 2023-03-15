import typescript from '@rollup/plugin-typescript';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import copy from 'rollup-plugin-copy';
import terser from '@rollup/plugin-terser';
const plugins = [typescript()];

const createConfig = (filename, extraPlugins = [], external = [], minify = false) => {
    const output = [
        {
            file: `./dist/${filename}.js`,
            format: 'es',
            name: filename,
        },
    ];
    if (minify) {
        output.push(
            {
                file: `./dist/${filename}.min.js`,
                format: 'es',
                name: filename,
                plugins: [terser()]
            }
        );
    }
    return {
        external,
        input: `src/${filename}.ts`,
        output,
        context: 'this',
        plugins: [...plugins, ...extraPlugins],
    };
};


export default [
    createConfig('index', [copy({ targets: [{ src: './node_modules/rustpotter-web-slim/rustpotter_wasm_bg.wasm', dest: './dist' }] })], ['rustpotter-web-slim']),
    createConfig('rustpotter-worklet', [nodeResolve()], [], true),
]