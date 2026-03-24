<?php

// app/Services/ExpoPushService.php
namespace App\Services;

use App\Models\User;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class ExpoPushService
{
    /**
     * Expo API giới hạn 100 notifications mỗi request
     */
    const BATCH_SIZE = 100;

    /**
     * Gửi notification tới Expo Push Token
     *
     * @param string|array $token Expo Push Token hoặc mảng token
     * @param string $title Tiêu đề
     * @param string $body Nội dung
     * @param array $data Dữ liệu bổ sung
     * @return array|null
     */
    public static function sendNotification($token, string $title, string $body, array $data = []): ?array
    {
        try {
            // Chuyển token về array nếu là string, lọc empty values
            $tokens = is_array($token) ? $token : [$token];
            $tokens = array_filter($tokens, fn($t) => !empty($t) && is_string($t));

            if (empty($tokens)) {
                Log::warning('ExpoPushService: No valid tokens to send to');
                return null;
            }

            // Tạo payload cho Expo API
            $payloads = array_map(function ($t) use ($title, $body, $data) {
                return [
                    'to' => $t,
                    'title' => $title,
                    'body' => $body,
                    'data' => !empty($data) ? $data : (object)[], // Expo requires object, not empty array
                    'sound' => 'default',
                    'priority' => 'high',
                    'channelId' => 'default',
                ];
            }, array_values($tokens));

            // Chunk thành batches ≤100 (giới hạn Expo API)
            $chunks = array_chunk($payloads, self::BATCH_SIZE);
            $allResults = [];
            $invalidTokens = [];

            foreach ($chunks as $chunk) {
                $response = Http::withHeaders([
                    'Accept' => 'application/json',
                    'Content-Type' => 'application/json',
                    'Accept-Encoding' => 'gzip, deflate',
                ])->timeout(30)->post('https://exp.host/--/api/v2/push/send', $chunk);

                if (!$response->successful()) {
                    Log::error('Expo push failed', [
                        'status' => $response->status(),
                        'response' => $response->body(),
                        'token_count' => count($chunk),
                    ]);
                    continue;
                }

                $responseData = $response->json();
                $allResults[] = $responseData;

                // Kiểm tra response để phát hiện invalid tokens
                $tickets = $responseData['data'] ?? [];
                foreach ($tickets as $index => $ticket) {
                    if (isset($ticket['status']) && $ticket['status'] === 'error') {
                        $errorType = $ticket['details']['error'] ?? '';

                        if ($errorType === 'DeviceNotRegistered') {
                            $invalidToken = $chunk[$index]['to'] ?? null;
                            if ($invalidToken) {
                                $invalidTokens[] = $invalidToken;
                                Log::info('Expo: DeviceNotRegistered, will clean token', [
                                    'token' => substr($invalidToken, 0, 20) . '...',
                                ]);
                            }
                        } else {
                            Log::warning('Expo push ticket error', [
                                'error' => $errorType,
                                'message' => $ticket['message'] ?? 'Unknown',
                                'token' => substr($chunk[$index]['to'] ?? '', 0, 20) . '...',
                            ]);
                        }
                    }
                }
            }

            // Tự động xóa invalid tokens khỏi DB
            if (!empty($invalidTokens)) {
                self::cleanupInvalidTokens($invalidTokens);
            }

            Log::info('Expo push completed', [
                'total_tokens' => count($tokens),
                'batches' => count($chunks),
                'invalid_tokens_cleaned' => count($invalidTokens),
            ]);

            return $allResults;
        } catch (\Exception $e) {
            Log::error('Expo push exception: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString(),
            ]);
            return null;
        }
    }

    /**
     * Xóa invalid tokens khỏi DB (DeviceNotRegistered)
     */
    private static function cleanupInvalidTokens(array $invalidTokens): void
    {
        try {
            $cleaned = User::whereIn('fcm_token', $invalidTokens)
                ->update(['fcm_token' => null]);

            Log::info("ExpoPushService: Cleaned {$cleaned} invalid tokens from users table");
        } catch (\Exception $e) {
            Log::error('Failed to cleanup invalid tokens: ' . $e->getMessage());
        }
    }
}
