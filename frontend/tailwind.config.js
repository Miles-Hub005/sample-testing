/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        surface: '#fbf9f4',
        'surface-dim': '#dbdad5',
        'surface-bright': '#fbf9f4',
        'surface-container-lowest': '#ffffff',
        'surface-container-low': '#f5f3ee',
        'surface-container': '#f0eee9',
        'surface-container-high': '#eae8e3',
        'surface-container-highest': '#e4e2dd',
        'on-surface': '#1b1c19',
        'on-surface-variant': '#4e453d',
        'inverse-surface': '#30312e',
        'inverse-on-surface': '#f2f1ec',
        outline: '#80756b',
        'outline-variant': '#d1c4b9',
        primary: '#59452b',
        'on-primary': '#ffffff',
        'primary-container': '#735c41',
        'on-primary-container': '#f5d6b4',
        secondary: '#a43b2c',
        tertiary: '#374a5f',
        error: '#ba1a1a',
        background: '#fbf9f4',
        'on-background': '#1b1c19',
      },
    },
  },
  plugins: [],
};
