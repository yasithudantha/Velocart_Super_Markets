/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#050505", // Deep futuristic black
        surface: "#121212",    // Elevated dark surface
        primary: "#D4AF37",    // Premium Gold (matching your Velocart logo)
        secondary: "#2A2A2A",  // Subtle borders/panels
        accent: "#ffffff",     // Pure white for high contrast text
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Playfair Display', 'serif'], // Elegant for big headings
      },
      boxShadow: {
        'glass': '0 4px 30px rgba(0, 0, 0, 0.1)',
        'glow': '0 0 20px rgba(212, 175, 55, 0.15)',
      }
    },
  },
  plugins: [],
}