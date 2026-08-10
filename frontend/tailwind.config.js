/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        void: "var(--bg-void)",
        panel: "var(--bg-panel)",
        "accent-red": "var(--accent-red)",
        "accent-cyan": "var(--accent-cyan)",
        "text-primary": "var(--text-primary)",
        "text-muted": "var(--text-muted)",
        "stress-calm": "var(--stress-calm)",
        "stress-tired": "var(--stress-tired)",
        "stress-stressed": "var(--stress-stressed)",
      }
    },
  },
  plugins: [],
}
