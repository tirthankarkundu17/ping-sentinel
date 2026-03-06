export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      colors: {
        brand: {
          50: "#edf8ff",
          100: "#d5efff",
          200: "#b0e4ff",
          300: "#7ed4ff",
          400: "#42beff",
          500: "#0ea5e9", // Adjusted slightly for a more vibrant tech aesthetic
          600: "#0284c7",
          700: "#0369a1",
          800: "#075985",
          900: "#0c4a6e"
        }
      }
    }
  },
  plugins: [],
};
