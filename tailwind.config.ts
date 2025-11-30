import type { Config } from "tailwindcss";

const config: Config = {
    content: [
        "./pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./components/**/*.{js,ts,jsx,tsx,mdx}",
        "./app/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            colors: {
                background: "var(--background)",
                foreground: "var(--foreground)",
                "ai-primary": "#A0232F",
                "ai-secondary": "#C92F3E",
                "ai-bg": "rgba(160, 35, 47, 0.1)",
                "action-primary": "#A0232F",
                "action-hover": "#C92F3E",
                "settings-icon": "#737373",
                "settings-hover": "#d4d4d4",
                burgundy: {
                    main: "#A0232F",
                    dark: "#6B1722",
                    "extra-dark": "#4A0F17",
                    light: "#C92F3E",
                    bright: "#DC3545",
                },
            },
            fontFamily: {
                sans: ["var(--font-geist-sans)"],
                mono: ["var(--font-geist-mono)"],
                courier: ["var(--font-courier-prime)", "Courier New", "monospace"],
                boldonse: ["Boldonse", "Impact", "sans-serif"],
            },
        },
    },
    plugins: [
        require('@tailwindcss/typography'),
    ],
};
export default config;
