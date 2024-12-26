import resolve from "rollup-plugin-node-resolve";
import commonjs from "rollup-plugin-commonjs";
import babel from "rollup-plugin-babel";
import { terser } from "rollup-plugin-terser";
import json from "rollup-plugin-json";
import { eslint } from 'rollup-plugin-eslint';
import serve from 'rollup-plugin-serve';
import livereload from 'rollup-plugin-livereload';
import pkg from './package.json';

const banner = `/**!
 * A simple console logging utility
 * Released under MIT license
 * @author Sachin Singh <contactsachinsingh@gmail.com>
 * @version v${pkg.version}
 * @license MIT
 */`;

const defaultConfig = {
    input: 'src/index.js',
    output: {
        file: 'dist/js/argonLogger.js',
        format: 'umd',
        name: 'Logger',
        sourcemap: true,
        banner
    },
    plugins: [
        json({
            namedExports: false,
            exclude: "node_modules/**"
        }),
        resolve({
            customResolveOptions: {
                moduleDirectory: "node_modules"
            }
        }),
        commonjs(),
        babel({
            exclude: "node_modules/**"
        })
    ]
};

if (process.env.SERVE) {
    defaultConfig.plugins.push(
        serve({
            open: true,
            contentBase: ['dist'],
            host: 'localhost',
            port: '3030'
        }),
        livereload({
            watch: 'dist',
            verbose: false
        })
    );
}

const productionConfig = Object.assign({}, defaultConfig);
productionConfig.output = Object.assign({}, productionConfig.output, {
    file: 'dist/js/argonLogger.min.js',
    sourcemap: false
});
productionConfig.plugins = [...defaultConfig.plugins, terser()];
defaultConfig.plugins = [
    eslint({
        exclude: [
            'node_modules/**',
            'json/**'
        ],
        throwOnError: true
    }),
    ...defaultConfig.plugins
];

const configurations = [defaultConfig];
if (!process.env.SERVE) {
    configurations.push(productionConfig);
}

export default configurations;