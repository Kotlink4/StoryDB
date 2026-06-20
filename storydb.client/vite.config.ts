import { defineConfig } from 'vite';
import plugin from '@vitejs/plugin-react';

const apiProxyTarget = process.env.VITE_API_PROXY_TARGET ?? 'http://localhost:5282';
const defaultChunkWarningLimitKb = 500;
const lazyLayoutChunkWarningLimitKb = 1600;

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [
        plugin(),
        {
            name: 'storydb-chunk-size-budget',
            generateBundle(_, bundle) {
                Object.values(bundle).forEach((asset) => {
                    if (asset.type !== 'chunk' || asset.fileName.includes('vendor-elk-')) {
                        return;
                    }

                    const sizeKb = Buffer.byteLength(asset.code, 'utf8') / 1024;
                    if (sizeKb > defaultChunkWarningLimitKb) {
                        this.warn(
                            `${asset.fileName} is ${sizeKb.toFixed(1)} kB after minification. ` +
                                `Keep non-ELK chunks under ${defaultChunkWarningLimitKb} kB.`,
                        );
                    }
                });
            },
        },
    ],
    build: {
        // ELK is lazy-loaded only for large relation graph layouts, but its bundled
        // layout engine is intentionally larger than Vite's default 500 kB warning.
        chunkSizeWarningLimit: lazyLayoutChunkWarningLimitKb,
        rolldownOptions: {
            output: {
                manualChunks(id) {
                    if (!id.includes('node_modules')) {
                        return undefined;
                    }

                    if (id.includes('elkjs')) {
                        return 'vendor-elk';
                    }

                    if (id.includes('@xyflow/react')) {
                        return 'vendor-flow';
                    }

                    if (id.includes('react-advanced-cropper')) {
                        return 'vendor-cropper';
                    }

                    if (id.includes('react') || id.includes('react-dom') || id.includes('react-router-dom')) {
                        return 'vendor-react';
                    }

                    return 'vendor';
                },
            },
        },
    },
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
