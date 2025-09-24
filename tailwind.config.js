/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./resources/**/*.blade.php",  // All blade templates
    "./resources/**/*.js",         // All JavaScript files
    "./resources/**/*.vue",        // Any Vue files (if using)
  ],
theme: {
  extend: {
    colors: {
      primary: 'var(--color-primary)',
      secondary: 'var(--color-secondary)',
      'custom-white': 'var(--color-white)',
      'total-white': 'var(--color-total-white)',
      'custom-gray': 'var(--color-gray)',
      'custom-red': 'var(--color-red)',
      'custom-black': 'var(--color-black)',
      'total-black': 'var(--color-total-black)',
    },
    fontFamily: {
      sans: ['var(--font-sans)'],
    },
    keyframes: {
      wiggle: {
        '0%, 100%': { transform: 'rotate(-3deg)' },
        '50%': { transform: 'rotate(3deg)' },
      },
      float: {
        '0%, 100%': { transform: 'translateY(0)' },
        '50%': { transform: 'translateY(-5px)' },
      },
    },
    animation: {
      wiggle: 'wiggle 0.5s ease-in-out',
      float: 'float 1s ease-in-out infinite',
    },
  },
},
  plugins: [],
}