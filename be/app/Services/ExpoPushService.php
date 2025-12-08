<?php

// app/Services/ExpoPushService.php
namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class ExpoPushService
{
    /**
     * Gửi notification tới Expo Push Token
     *
     * @param string|array $token Expo Push Token hoặc mảng token
     * @param string $title Tiêu đề
     * @param string $body Nội dung
     * @param array $data Dữ liệu bổ sung
     */
    public static function sendNotification($token, string $title, string $body, array $data = [])
    {
        try {
            // Chuyển token về array nếu là string
            $tokens = is_array($token) ? $token : [$token];

            // Tạo payload cho Expo API
            $payloads = array_map(fn($t) => [
                'to' => $t,
                'title' => $title,
                'body' => $body,
                'data' => $data,
                'sound' => 'default', // bật âm thanh notification
            ], $tokens);

            Log::info('Payload', $payloads);

            // Gửi request tới Expo Push API
            $response = Http::withHeaders([
                'Accept' => 'application/json',
                'Content-Type' => 'application/json',
            ])->post('https://exp.host/--/api/v2/push/send', $payloads);

            // Log lỗi nếu không thành công
            if (!$response->successful()) {
                Log::error('Expo push failed', [
                    'response' => $response->body(),
                    'tokens' => $tokens,
                ]);
            } else {
                // Log response ok
                Log::info('Expo push response', ['response' => $response->json()]);
            }

            return $response->json();
        } catch (\Exception $e) {
            Log::error('Expo push exception: ' . $e->getMessage());
            return null;
        }
    }
}
