import type { Config } from "tailwindcss";
const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}", "./components/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      fontFamily: { sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"] },
      boxShadow: {
        soft: "0 18px 60px rgba(23, 37, 84, 0.08)",
        card: "0 8px 30px rgba(23, 37, 84, 0.05)"
      }
    },
  },
  plugins: [],
};
export default config;
