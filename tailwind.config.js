/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // 黑白灰主题
        gray: {
          50: '#FAFAFA',   // 浅白
          100: '#F5F5F5',  // 背景
          200: '#E5E5E5',  // 边框
          300: '#D4D4D4',  // 次级边框
          400: '#A3A3A3',  // 禁用/占位
          500: '#737373',  // 次级文字
          600: '#525252',  // 主要文字
          700: '#404040',  // 强调文字
          800: '#262626',  // 深色背景
          900: '#171717',  // 最深背景
          950: '#0A0A0A', // 纯黑
        },
        // 兼容旧名称
        studio: {
          50: '#FAFAFA',
          100: '#F5F5F5',
          200: '#E5E5E5',
          300: '#D4D4D4',
          400: '#A3A3A3',
          500: '#737373',
          600: '#525252',
        },
        caramel: {
          50: '#FAFAFA',
          100: '#F5F5F5',
          200: '#E5E5E5',
          300: '#D4D4D4',
          400: '#A3A3A3',
          500: '#737373',
          600: '#525252',
        },
        neon: {
          50: '#FAFAFA',
          100: '#F5F5F5',
          200: '#E5E5E5',
          300: '#D4D4D4',
          400: '#A3A3A3',
          500: '#737373',
          600: '#525252',
        },
        ink: {
          50: '#D4D4D4',
          100: '#A3A3A3',
          200: '#737373',
          300: '#525252',
          400: '#404040',
          500: '#262626',
          600: '#1A1A1A',
          700: '#0A0A0A',
        },
        dark: {
          DEFAULT: '#0A0A0A',
          50: '#171717',
          100: '#262626',
          200: '#404040',
          300: '#525252',
          400: '#737373',
          500: '#A3A3A3',
          600: '#D4D4D4',
          700: '#E5E5E5',
          800: '#F5F5F5',
          900: '#FAFAFA',
        },
        fluorescent: {
          DEFAULT: '#171717',
          light: '#262626',
          dark: '#0A0A0A',
        },
        // 功能色
        success: '#22C55E',
        warning: '#EAB308',
        error: '#EF4444',
        info: '#3B82F6',
      },
      fontFamily: {
        // 标题字体 - 有特色但不过度装饰
        display: ['"Noto Serif SC"', 'Georgia', 'serif'],
        // 正文字体 - 清晰易读
        body: ['"Source Han Sans SC"', '"PingFang SC"', 'system-ui', 'sans-serif'],
        // 等宽 - 代码/数据
        mono: ['"JetBrains Mono"', 'Consolas', 'monospace'],
      },
      boxShadow: {
        // 柔和阴影
        'soft': '0 2px 8px rgba(0, 0, 0, 0.08)',
        'medium': '0 4px 16px rgba(0, 0, 0, 0.12)',
        'elevated': '0 8px 32px rgba(0, 0, 0, 0.16)',
      },
      borderRadius: {
        'xl': '12px',
        '2xl': '16px',
        '3xl': '24px',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float': 'float 3s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-4px)' },
        }
      }
    },
  },
  plugins: [],
}
