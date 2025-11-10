import type { Config } from 'tailwindcss';

export default {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
    './lib/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        background: 'hsl(var(--background) / <alpha-value>)',
        foreground: 'hsl(var(--foreground) / <alpha-value>)',
        card: {
          DEFAULT: 'hsl(var(--card) / <alpha-value>)',
          foreground: 'hsl(var(--card-foreground) / <alpha-value>)',
        },
        primary: {
          DEFAULT: 'hsl(var(--primary) / <alpha-value>)',
          foreground: 'hsl(var(--primary-foreground) / <alpha-value>)',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary) / <alpha-value>)',
          foreground: 'hsl(var(--secondary-foreground) / <alpha-value>)',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive) / <alpha-value>)',
          foreground: 'hsl(var(--destructive-foreground) / <alpha-value>)',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted) / <alpha-value>)',
          foreground: 'hsl(var(--muted-foreground) / <alpha-value>)',
        },
        accentColor: {
          DEFAULT: 'hsl(var(--accent) / <alpha-value>)',
          foreground: 'hsl(var(--accent-foreground) / <alpha-value>)',
        },
        border: 'hsl(var(--border) / <alpha-value>)',
        input: 'hsl(var(--input) / <alpha-value>)',
        ring: 'hsl(var(--ring) / <alpha-value>)',
        /* Binnacle custom colors */
        bg: {
          primary: 'var(--bkl-color-bg-primary)',
          secondary: 'var(--bkl-color-bg-secondary)',
          tertiary: 'var(--bkl-color-bg-tertiary)',
        },
        text: {
          primary: 'var(--bkl-color-text-primary)',
          secondary: 'var(--bkl-color-text-secondary)',
          disabled: 'var(--bkl-color-text-disabled)',
        },
        accentBkl: {
          primary: 'var(--bkl-color-accent-primary)',
          hover: 'var(--bkl-color-accent-hover)',
          secondary: 'var(--bkl-color-accent-secondary)',
        },
        status: {
          playing: 'var(--bkl-color-status-playing)',
          completed: 'var(--bkl-color-status-completed)',
          backlog: 'var(--bkl-color-status-backlog)',
          onhold: 'var(--bkl-color-status-onhold)',
          dropped: 'var(--bkl-color-status-dropped)',
        },
        feedback: {
          error: 'var(--bkl-color-feedback-error)',
          success: 'var(--bkl-color-feedback-success)',
        },
      },
      fontSize: {
        xs: 'var(--bkl-font-size-xs)',
        sm: 'var(--bkl-font-size-sm)',
        base: 'var(--bkl-font-size-base)',
        lg: 'var(--bkl-font-size-lg)',
        xl: 'var(--bkl-font-size-xl)',
        '2xl': 'var(--bkl-font-size-2xl)',
        '3xl': 'var(--bkl-font-size-3xl)',
        '4xl': 'var(--bkl-font-size-4xl)',
        '5xl': 'var(--bkl-font-size-5xl)',
      },
      fontWeight: {
        regular: 'var(--bkl-font-weight-regular)',
        medium: 'var(--bkl-font-weight-medium)',
        semibold: 'var(--bkl-font-weight-semibold)',
        bold: 'var(--bkl-font-weight-bold)',
      },
      lineHeight: {
        none: 'var(--bkl-leading-none)',
        tight: 'var(--bkl-leading-tight)',
        snug: 'var(--bkl-leading-snug)',
        normal: 'var(--bkl-leading-normal)',
        relaxed: 'var(--bkl-leading-relaxed)',
      },
      spacing: {
        0: 'var(--bkl-space-0)',
        1: 'var(--bkl-space-1)',
        2: 'var(--bkl-space-2)',
        3: 'var(--bkl-space-3)',
        4: 'var(--bkl-space-4)',
        5: 'var(--bkl-space-5)',
        6: 'var(--bkl-space-6)',
        8: 'var(--bkl-space-8)',
        10: 'var(--bkl-space-10)',
        12: 'var(--bkl-space-12)',
        16: 'var(--bkl-space-16)',
        24: 'var(--bkl-space-24)',
      },
      borderRadius: {
        none: 'var(--bkl-radius-none)',
        sm: 'var(--bkl-radius-sm)',
        md: 'var(--bkl-radius-md)',
        lg: 'var(--bkl-radius-lg)',
        full: 'var(--bkl-radius-full)',
      },
      boxShadow: {
        sm: 'var(--bkl-shadow-sm)',
        md: 'var(--bkl-shadow-md)',
        lg: 'var(--bkl-shadow-lg)',
        glow: 'var(--bkl-shadow-glow)',
      },
    },
  },
  plugins: [],
} satisfies Config;
