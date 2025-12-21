/**
 * Format số tiền theo chuẩn VND
 * @param amount - Số tiền cần format
 * @returns Chuỗi đã format (ví dụ: "1.000.000 ₫")
 */
export const formatVND = (amount: number | null | undefined): string => {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return "0 ₫";
  }
  
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(amount);
};

/**
 * Format số tiền theo chuẩn VND (không có ký hiệu ₫)
 * @param amount - Số tiền cần format
 * @returns Chuỗi đã format (ví dụ: "1.000.000 VND")
 */
export const formatVNDWithoutSymbol = (amount: number | null | undefined): string => {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return "0 VND";
  }
  
  return new Intl.NumberFormat("vi-VN").format(amount) + " VND";
};

/**
 * Format số với dấu phẩy phân cách hàng nghìn
 * @param value - Giá trị cần format
 * @param decimals - Số chữ số thập phân (mặc định: 0)
 * @returns Chuỗi đã format (ví dụ: "1.000.000" hoặc "1.000.000,5")
 */
export const formatNumber = (value: number | null | undefined, decimals: number = 0): string => {
  if (value === null || value === undefined || isNaN(value)) {
    return "0";
  }
  
  return new Intl.NumberFormat("vi-VN", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
};

