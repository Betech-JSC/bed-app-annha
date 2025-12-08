<?php

use App\Models\Setting;

if (!function_exists('setting')) {
    /**
     * Lấy giá trị setting theo key
     *
     * @param string $key
     * @param mixed $default
     * @return mixed
     */
    function setting(string $key, $default = null)
    {
        static $cache = [];

        // Nếu đã lấy từ cache trước đó thì trả về luôn
        if (isset($cache[$key])) {
            return $cache[$key];
        }

        $value = Setting::where('key', $key)->value('value');

        // Lưu cache để tránh query lại nhiều lần
        $cache[$key] = $value ?? $default;

        return $cache[$key];
    }
}

if (!function_exists('money_format_vn')) {
    /**
     * Định dạng tiền VND (ví dụ: 100000 -> 100,000 ₫)
     *
     * @param float|int $amount
     * @return string
     */
    function money_format_vn($amount)
    {
        return number_format($amount, 0, ',', '.') . ' ₫';
    }
}
