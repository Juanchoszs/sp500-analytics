/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Grises neutros - Paleta institucional sofisticada
        background: "#020617",      // Casi negro
        surface: "#0F172A",         // Slate 900
        "surface-hover": "#1E293B", // Slate 800
        border: "#1E293B",          // Slate 800
        "border-light": "#334155",  // Slate 700
        
        // Texto
        "text-primary": "#F8FAFC",   // Slate 50
        "text-secondary": "#94A3B8", // Slate 400
        "text-tertiary": "#64748B",  // Slate 500
        
        // Acentos informativos (menos saturados)
        success: "#10B981",         // Emerald 500
        warning: "#F59E0B",         // Amber 500
        danger: "#EF4444",          // Red 500
        info: "#3B82F6",            // Blue 500
        
        // Financieros sutiles
        bullish: "#059669",         // Emerald 600 (más sofisticado)
        bearish: "#DC2626",         // Red 600 (más sofisticado)
        neutral: "#6B7280",         // Gray 500
        
        // Legacy colors for compatibility
        primary: "#0F172A",
        secondary: "#1E293B",
        accent: "#22C55E",
        foreground: "#F8FAFC",
        muted: "#1A1E2F",
        destructive: "#EF4444",
        ring: "#0F172A",
      },
      fontFamily: {
        sans: ["Inter", "sans-serif"],
        mono: ["IBM Plex Mono", "monospace"],
      },
      spacing: {
        // Retícula base (8px system)
        base: "8px",
        
        // Espaciados generosos
        "section-gap": "32px",     // gap-8 entre secciones principales
        "component-gap": "24px",   // gap-6 entre componentes
        "element-gap": "16px",     // gap-4 entre elementos
        
        // Márgenes
        "page-margin": "48px",     // p-12 márgenes de página
        "section-margin": "32px",  // p-8 márgenes de sección
        "card-margin": "24px",     // p-6 márgenes de card
        
        // Padding interno
        "card-padding": "32px",    // p-8 dentro de cards
        "dense-padding": "24px",   // p-6 para elementos densos
        
        // Legacy spacing
        xs: "2px",
        sm: "4px",
        md: "8px",
        lg: "12px",
        xl: "16px",
        "2xl": "24px",
        "3xl": "32px",
      },
      boxShadow: {
        sm: "0 1px 2px rgba(0,0,0,0.05)",
        md: "0 4px 6px rgba(0,0,0,0.1)",
        lg: "0 10px 15px rgba(0,0,0,0.1)",
        xl: "0 20px 25px rgba(0,0,0,0.15)",
      },
      keyframes: {
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "pulse-slow": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.5" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.4s cubic-bezier(0.16, 1, 0.3, 1) both",
        "pulse-slow": "pulse-slow 3s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
