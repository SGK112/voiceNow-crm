/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: [
    './pages/**/*.{js,jsx}',
    './components/**/*.{js,jsx}',
    './app/**/*.{js,jsx}',
    './src/**/*.{js,jsx}',
  ],
  theme: {
    container: {
      center: true,
      padding: {
        DEFAULT: '1rem',
        sm: '1.5rem',
        lg: '2rem',
      },
      screens: {
        sm: '640px',
        md: '768px',
        lg: '1024px',
        xl: '1280px',
        '2xl': '1400px',
      },
    },
    extend: {
      /* ===== Typography (Twenty CRM inspired) ===== */
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        'xxs': ['0.625rem', { lineHeight: '0.875rem' }],      // 10px
        'xs': ['0.85rem', { lineHeight: '1.25rem' }],         // 13.6px
        'sm': ['0.92rem', { lineHeight: '1.375rem' }],        // 14.7px
        'base': ['1rem', { lineHeight: '1.5rem' }],           // 16px
        'lg': ['1.23rem', { lineHeight: '1.75rem' }],         // 19.7px
        'xl': ['1.54rem', { lineHeight: '2rem' }],            // 24.6px
        '2xl': ['1.85rem', { lineHeight: '2.25rem' }],        // 29.6px
      },
      fontWeight: {
        regular: '400',
        medium: '500',
        semibold: '600',
      },

      /* ===== Colors (Twenty CRM grayscale + semantic) ===== */
      colors: {
        /* Shadcn/UI compatibility */
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',

        primary: {
          50: 'hsl(var(--primary-50))',
          100: 'hsl(var(--primary-100))',
          200: 'hsl(var(--primary-200))',
          300: 'hsl(var(--primary-300))',
          400: 'hsl(var(--primary-400))',
          500: 'hsl(var(--primary-500))',
          600: 'hsl(var(--primary-600))',
          700: 'hsl(var(--primary-700))',
          800: 'hsl(var(--primary-800))',
          900: 'hsl(var(--primary-900))',
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },

        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },

        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },

        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },

        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },

        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },

        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },

        /* Semantic colors */
        success: {
          DEFAULT: 'hsl(var(--success))',
          light: 'hsl(var(--success-light))',
        },
        warning: {
          DEFAULT: 'hsl(var(--warning))',
          light: 'hsl(var(--warning-light))',
        },
        danger: {
          DEFAULT: 'hsl(var(--danger))',
          light: 'hsl(var(--danger-light))',
        },
        info: {
          DEFAULT: 'hsl(var(--info))',
          light: 'hsl(var(--info-light))',
        },

        /* Grayscale tokens */
        gray: {
          50: 'hsl(var(--gray-50))',
          100: 'hsl(var(--gray-100))',
          150: 'hsl(var(--gray-150))',
          200: 'hsl(var(--gray-200))',
          300: 'hsl(var(--gray-300))',
          400: 'hsl(var(--gray-400))',
          500: 'hsl(var(--gray-500))',
          600: 'hsl(var(--gray-600))',
          700: 'hsl(var(--gray-700))',
          800: 'hsl(var(--gray-800))',
          900: 'hsl(var(--gray-900))',
          950: 'hsl(var(--gray-950))',
        },
      },

      /* ===== Border Radius (Twenty CRM system) ===== */
      borderRadius: {
        'xs': '2px',
        'sm': '4px',
        'DEFAULT': '8px',
        'md': '8px',
        'lg': 'var(--radius)',
        'xl': '20px',
        '2xl': '40px',
        'pill': '999px',
        'full': '9999px',
      },

      /* ===== Box Shadow (Twenty CRM levels) ===== */
      boxShadow: {
        'light': 'var(--shadow-light)',
        'DEFAULT': 'var(--shadow-medium)',
        'medium': 'var(--shadow-medium)',
        'strong': 'var(--shadow-strong)',
        'xl': 'var(--shadow-xl)',
      },

      /* ===== Animation & Transitions (Twenty CRM timing) ===== */
      transitionDuration: {
        'instant': '75ms',
        'fast': '150ms',
        'DEFAULT': '300ms',
        'normal': '300ms',
        'slow': '1500ms',
      },

      transitionTimingFunction: {
        'ease': 'ease',
        'ease-in': 'ease-in',
        'ease-out': 'ease-out',
        'ease-in-out': 'ease-in-out',
      },

      /* ===== Spacing (Extended) ===== */
      spacing: {
        '18': '4.5rem',
        '22': '5.5rem',
      },

      screens: {
        'xs': '480px',
      },
    },
  },
  plugins: [],
};
