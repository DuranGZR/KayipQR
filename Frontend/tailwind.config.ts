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
        paper: {
          DEFAULT: "#FAF5EA",
          card: "#FFFDF7",
          hover: "#F5EFE0",
          border: "#33302B",
        },
        ink: {
          DEFAULT: "#33302B",
          soft: "#666055",
          muted: "#8C8476",
        },
        gold: {
          DEFAULT: "#F2B63C",
          dark: "#D99B26",
          light: "#FDF0D5",
          tape: "rgba(242, 182, 60, 0.75)",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "Plus Jakarta Sans", "-apple-system", "sans-serif"],
      },
      boxShadow: {
        sketch: "3px 3px 0px #33302B",
        "sketch-sm": "2px 2px 0px #33302B",
        "sketch-lg": "5px 5px 0px #33302B",
      },
    },
  },
  plugins: [],
};
export default config;
