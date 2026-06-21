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
        ink: "#15171C",
        steel: "#2E6CA0",
        mint: "#2FB389",
        "ink-light": "#2A2D35",
        "steel-light": "#4A8EC4",
        "mint-light": "#4ECBA3",
      },
      fontFamily: {
        grotesk: ["var(--font-space-grotesk)"],
        manrope: ["var(--font-manrope)"],
      },
      fontSize: {
        xs: ["12px", { lineHeight: "16px" }],
        sm: ["14px", { lineHeight: "20px" }],
        base: ["16px", { lineHeight: "24px" }],
        lg: ["18px", { lineHeight: "28px" }],
        xl: ["20px", { lineHeight: "28px" }],
        "2xl": ["24px", { lineHeight: "32px" }],
        "3xl": ["32px", { lineHeight: "40px" }],
        "4xl": ["40px", { lineHeight: "48px" }],
        "5xl": ["56px", { lineHeight: "64px" }],
      },
      spacing: {
        "safe-top": "env(safe-area-inset-top)",
        "safe-bottom": "env(safe-area-inset-bottom)",
      },
      animation: {
        floaty: "floaty 6s ease-in-out infinite",
        fadeUp: "fadeUp 0.7s ease both",
        drawIn: "drawIn 1.4s ease forwards",
        pulseDot: "pulseDot 2s infinite",
        introOverlay: "introOverlay 2.5s ease forwards",
        introLogo: "introLogo 1.7s cubic-bezier(.2,.75,.2,1) both",
        introLine: "introLine 1.8s ease 0.25s both",
        introFade: "introFade 2s ease both",
        transitIn: "transitIn 0.55s cubic-bezier(.7,0,.3,1) forwards",
        transitLogo: "transitLogo 0.9s ease both",
        auroraA: "auroraA 16s ease-in-out infinite",
        auroraB: "auroraB 20s ease-in-out infinite",
        auroraC: "auroraC 22s ease-in-out infinite",
        beamSweep: "beamSweep 11s ease-in-out infinite",
        dustRise: "dustRise 9s linear infinite",
        scanGrid: "scanGrid 9s linear infinite",
      },
    },
  },
  plugins: [],
};

export default config;
