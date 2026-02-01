/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                'electric-cyan': '#00E5FF',
                'dark-bg': '#000000',
            },
            fontFamily: {
                'outfit': ['Outfit', 'sans-serif'],
            },
            animation: {
                'fade-in-up': 'fadeInUp 0.5s ease-out',
                'slide-up': 'slideUp 0.3s ease-out',
                'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
            },
            keyframes: {
                fadeInUp: {
                    '0%': { opacity: '0', transform: 'translateY(20px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                },
                slideUp: {
                    '0%': { transform: 'translateY(100%)' },
                    '100%': { transform: 'translateY(0)' },
                },
                pulseGlow: {
                    '0%, 100%': { boxShadow: '0 0 20px rgba(0, 229, 255, 0.3)' },
                    '50%': { boxShadow: '0 0 40px rgba(0, 229, 255, 0.6)' },
                },
            },
        },
    },
    plugins: [],
}
