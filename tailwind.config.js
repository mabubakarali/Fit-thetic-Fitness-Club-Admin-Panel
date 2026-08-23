/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
          hover: 'hsl(var(--primary-hover))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        discord: {
          blurple: '#5865F2',
          'blurple-hover': '#4752C4',
          'blurple-active': '#3C45A5',
          green: '#23A55A',
          yellow: '#F0B232',
          red: '#DA373C',
          darkBg: '#1E1F22',
          sidebarBg: '#2B2D31',
          cardBg: '#313338',
          inputBg: '#1E1F22',
          hoverBg: '#35373C',
          activeBg: '#404249',
          border: '#3F4147',
          textPrimary: '#F2F3F5',
          textMuted: '#949BA4',
          textHover: '#DBDEE1',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      fontFamily: {
        sans: ['"gg sans"', '"Noto Sans"', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      boxShadow: {
        'discord': '0 8px 16px rgba(0,0,0,0.24)',
        'modal': '0 0 0 1px rgba(32,34,37,0.6), 0 16px 32px rgba(0,0,0,0.4)',
      },
      screens: {
        'xs': '375px',
        'print': {'raw': 'print'},
      }
    },
  },
  plugins: [],
}
