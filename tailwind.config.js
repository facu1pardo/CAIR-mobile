/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        primary: "#1a4731",
        "primary-light": "#22603f",
        secondary: "#c9a227",
        "secondary-light": "#d4b04a",
      },
    },
  },
  plugins: [],
}
