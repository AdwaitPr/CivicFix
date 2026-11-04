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
        brand: {
          50: "#eef5fc",
          100: "#d9e8f8",
          500: "#174EA6",
          600: "#13408b",
          700: "#1E3A8A",
          900: "#0f2759",
        },
        civic: {
          teal: "#0D9488",
          cyan: "#12B5CB",
          amber: "#FA903E",
          red: "#D93025",
          green: "#16A34A",
          slate: "#575B5F",
        },
      },
    },
  },
  plugins: [],
};

export default config;
