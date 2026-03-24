import defaultTheme from 'tailwindcss/defaultTheme'

export default {
  content: ['./resources/**/*.{js,vue,blade.php}'],
  theme: {
    extend: {
      colors: {
        crm: {
          primary: '#1B4F72',
          'primary-light': '#2E86C1',
          'primary-lighter': '#AED6F1',
          'primary-dark': '#154360',
          accent: '#F39C12',
          'accent-light': '#F7DC6F',
          success: '#1D8348',
          danger: '#C0392B',
          warning: '#E67E22',
          sidebar: '#0C1B2A',
        },
        indigo: {
          100: '#e6e8ff',
          300: '#b2b7ff',
          400: '#7886d7',
          500: '#6574cd',
          600: '#5661b3',
          800: '#2f365f',
          900: '#191e38',
        },
      },
      fontFamily: {
        sans: ['Inter', ...defaultTheme.fontFamily.sans],
      },
    },
  },
}
