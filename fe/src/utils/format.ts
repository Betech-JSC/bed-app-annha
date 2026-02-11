import { format, isValid, parseISO } from "date-fns";
import { vi } from "date-fns/locale";

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

/**
 * Format ngày tháng theo chuẩn vi-VN
 * @param date - Giá trị ngày (string ISO, Date, null, undefined)
 * @param formatStr - Định dạng mong muốn (mặc định: "dd/MM/yyyy")
 * @returns Chuỗi đã format hoặc "-" nếu không hợp lệ
 */
export const formatDate = (
  date: string | Date | null | undefined,
  formatStr: string = "dd/MM/yyyy"
): string => {
  if (!date) return "-";

  const d = typeof date === "string" ? parseISO(date) : date;

  if (!isValid(d)) return "-";

  return format(d, formatStr, { locale: vi });
};

/**
 * Format khoảng thời gian
 * @param startDate - Ngày bắt đầu
 * @param endDate - Ngày kết thúc
 * @returns Chuỗi format (ví dụ: "01/01/2024 - 10/01/2024") hoặc chỉ 1 ngày nếu trùng nhau
 */
export const formatDateRange = (
  startDate: string | Date | null | undefined,
  endDate: string | Date | null | undefined
): string => {
  const start = formatDate(startDate);
  const end = formatDate(endDate);

  if (start === "-" && end === "-") return "-";
  if (start === "-") return end;
  if (end === "-") return start;
  if (start === end) return start;

  return `${start} - ${end}`;
};


