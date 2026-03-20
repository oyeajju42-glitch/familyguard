/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        primary: "#0f172a",
        secondary: "#e2e8f0",
        accent: "#10b981",
        warning: "#f59e0b",
        danger: "#ef4444",
      },
      boxShadow: {
        soft: "0 8px 30px rgba(15, 23, 42, 0.07)",
      },
      borderRadius: {
        xl: "0.9rem",
      },
    },
  },
  plugins: [],
};
