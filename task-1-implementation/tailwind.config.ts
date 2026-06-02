import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        cerebras: {
          orange: "#FF6B35",
          dark: "#0f1419",
          panel: "#1a2332",
          border: "#2d3a4f",
        },
      },
    },
  },
  plugins: [],
};
export default config;
