import { defineConfig } from 'vite';
import plugin from '@vitejs/plugin-react';

const apiProxyTarget = process.env.VITE_API_PROXY_TARGET ?? 'http://localhost:5282';

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [plugin()],
    server: {
        port: 50201,
        proxy: {
            '/api': {
                target: apiProxyTarget,
                changeOrigin: true,
            },
            '/uploads': {
                target: apiProxyTarget,
                changeOrigin: true,
            },
            '/health': {
                target: apiProxyTarget,
                changeOrigin: true,
            },
            '/metrics': {
                target: apiProxyTarget,
                changeOrigin: true,
            },
        },
    }
})
