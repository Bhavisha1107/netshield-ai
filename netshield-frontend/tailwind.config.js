/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],

  theme: {
    extend: {
      colors: {
        base: "#14161C",
        panel: "#1C1F27",
        panel2: "#252936",
        line: "#2E323D",
        text: "#E7E9EE",
        muted: "#8A8F9C",
        violet: "#8B7CF6",
        signal: "#34D399",
        alert: "#F5A855",
        critical: "#EF4444",
      },

      fontFamily: {
        sans: ["Inter", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
    },
  },

  plugins: [],
};