/** @type {import('tailwindcss').Config} */
module.exports = {
  // NOTE: Update this to include the paths to all files that contain Nativewind classes.
  content: ["./App.tsx", "./app/**/*.{js,jsx,ts,tsx}",],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      spacing: {
        '4': '1rem',  // Đảm bảo spacing có sẵn
      },
      colors: {
        primary: "#2463eb",
        secondary: "#F97316",
        "background-light": "#F5F7FB",
        "background-dark": "#111621",
        "text-primary-light": "#1F2937",
        "text-primary-dark": "#F5F7FB",
        "text-secondary-light": "#6b7280",
        "text-secondary-dark": "#9ca3af",
        "card-light": "#ffffff",
        "card-dark": "#1F2937",
        "border-light": "#e5e7eb",
        "border-dark": "#374151",
      },
    },
  },
  plugins: [],
  container: {
    center: true, // Canh giữa container
    padding: '32px', // Thêm padding vào container
    screens: {
      sm: '100%', // Chiều rộng 100% trên màn hình nhỏ
      md: '900px', // Chiều rộng tối đa là 900px trên màn hình vừa
      lg: '1200px', // Chiều rộng tối đa là 1200px trên màn hình lớn
    },
  },
}