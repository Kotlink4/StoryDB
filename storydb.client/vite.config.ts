import { defineConfig } from 'vite';
import plugin from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [plugin()],
    server: {
        port: 50201,
        proxy: {
            '/api': 'http://localhost:5282',
            '/uploads': 'http://localhost:5282',
        },
    }
})
