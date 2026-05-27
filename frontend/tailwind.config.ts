import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{js,ts,jsx,tsx}', './components/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        border: 'var(--border)',
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        card: 'var(--card)',
        'card-foreground': 'var(--card-foreground)',
        popover: 'var(--popover)',
        'popover-foreground': 'var(--popover-foreground)',
        primary: 'var(--primary)',
        'primary-foreground': 'var(--primary-foreground)',
        secondary: 'var(--secondary)',
        'secondary-foreground': 'var(--secondary-foreground)',
        muted: 'var(--muted)',
        'muted-foreground': 'var(--muted-foreground)',
        accent: 'var(--accent)',
        'accent-foreground': 'var(--accent-foreground)',
        destructive: 'var(--destructive)',
        input: 'var(--input)',
        ring: 'var(--ring)',
        sidebar: 'var(--sidebar)',
        'sidebar-foreground': 'var(--sidebar-foreground)',
        'sidebar-primary': 'var(--sidebar-primary)',
        'sidebar-primary-foreground': 'var(--sidebar-primary-foreground)',
        'sidebar-accent': 'var(--sidebar-accent)',
        'sidebar-accent-foreground': 'var(--sidebar-accent-foreground)',
        'sidebar-border': 'var(--sidebar-border)',
        'sidebar-ring': 'var(--sidebar-ring)',
      },
      borderColor: {
        border: 'var(--border)',
        input: 'var(--input)',
        destructive: 'var(--destructive)',
        sidebar: 'var(--sidebar-border)',
      },
      ringColor: {
        ring: 'var(--ring)',
        primary: 'var(--primary)',
        destructive: 'var(--destructive)',
      },
      backgroundColor: {
        background: 'var(--background)',
        card: 'var(--card)',
        popover: 'var(--popover)',
        muted: 'var(--muted)',
        input: 'var(--input)',
      },
      textColor: {
        foreground: 'var(--foreground)',
        'card-foreground': 'var(--card-foreground)',
        'popover-foreground': 'var(--popover-foreground)',
        'primary-foreground': 'var(--primary-foreground)',
        'secondary-foreground': 'var(--secondary-foreground)',
        'muted-foreground': 'var(--muted-foreground)',
        'accent-foreground': 'var(--accent-foreground)',
        destructive: 'var(--destructive)',
      },
      borderRadius: {
        lg: 'var(--radius)',
      },
    },
  },
  plugins: [],
};

export default config;
