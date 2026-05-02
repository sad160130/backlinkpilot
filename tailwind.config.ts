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
        background: "var(--background)",
        foreground: "var(--foreground)",
        forest: "#1B4332",
        jade: "#2D6A4F",
        sage: "#95D5B2",
        cream: "#FEFAE0",
        amber: "#F4A261",
      },
    },
  },
  plugins: [],
};
export default config;
