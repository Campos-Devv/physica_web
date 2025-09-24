import { defineConfig } from 'vite';
import laravel from 'laravel-vite-plugin';

export default defineConfig({
    plugins: [
        laravel({
            input: [
                'resources/css/app.css', 
                'resources/css/auth/login.css',
                'resources/css/roles/principal/assign_teachers.css',
                'resources/css/roles/science/science.css',
                'resources/css/roles/head/view_lesson.css',
                
                'resources/js/app.js',
                'resources/js/auth/login.js',
                'resources/js/roles/principal/assign_teachers.js',
                'resources/js/roles/science/science.js',
                'resources/js/roles/head/view_lesson.js'
            ],
            refresh: true,
        }),
    ],
    resolve: {
        alias: {
            // Add any necessary aliases here
        },
    },
    optimizeDeps: {
        include: ['chart.js'],
    },
    build: {
        assetsInlineLimit: 0, // Don't inline assets as base64
    },
});
