# Cài đặt thư viện Chart

Đã thay thế `react-native-chart-kit` bằng `react-native-gifted-charts` để có hiệu năng và tính năng tốt hơn.

## Cài đặt

```bash
cd fe
npm install react-native-gifted-charts
```

## Đã thay đổi

1. **LineChart**: Biểu đồ đường với 2 datasets (Doanh thu và Chi phí)
2. **BarChart**: Biểu đồ cột với màu động (xanh cho lợi nhuận dương, đỏ cho âm)
3. **PieChart**: Biểu đồ tròn với donut chart và center label

## Lợi ích

- Hiệu năng tốt hơn (sử dụng SVG native thay vì WebView)
- API linh hoạt hơn
- Hỗ trợ animation mượt mà
- Customization tốt hơn

