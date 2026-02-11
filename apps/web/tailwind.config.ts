import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          500: "#0f766e",
          700: "#0b4f4a"
        }
      }
    }
  },
  plugins: []
};

export default config;
