import { defineConfig } from 'vite';
import restart from 'vite-plugin-restart';
import glsl from 'vite-plugin-glsl'

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [
        restart({ restart: [ 'public/**', ] }),
        glsl(),
    ],
    resolve: {
        alias: {
        },
    },
    build: {
        sourcemap: true,
        emptyOutDir: true,
    },
    server: {
        port: 5200,
        hmr: {
            clientPort: 5200,
        }
    },
    base: "/"
});