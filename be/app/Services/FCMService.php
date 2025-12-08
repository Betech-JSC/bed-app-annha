<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class FCMService
{
    public static function sendNotification($token, string $title, string $body, array $data = [])
    {
        try {
            $serverKey = env('FCM_SERVER_KEY');

            $payload = [
                'to' => $token,
                'notification' => [
                    'title' => $title,
                    'body' => $body,
                    'sound' => 'default'
                ],
                'data' => $data,
            ];

            $response = Http::withHeaders([
                'Authorization' => 'key=' . $serverKey,
                'Content-Type' => 'application/json',
            ])->post('https://fcm.googleapis.com/fcm/send', $payload);

            if (!$response->successful()) {
                Log::error('FCM push failed', [
                    'response' => $response->body(),
                    'tokens' => $token,
                ]);
            } else {
                Log::info('FCM push response', ['response' => $response->json()]);
            }

            return $response->json();
        } catch (\Exception $e) {
            Log::error('FCM push exception: ' . $e->getMessage());
            return null;
        }
    }
}
