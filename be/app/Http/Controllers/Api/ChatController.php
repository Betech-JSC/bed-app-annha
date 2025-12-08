<?php

namespace App\Http\Controllers\Api;

use App\Events\ChatMessage;
use Illuminate\Http\Request;
use App\Events\ChatMessageSent;
use App\Http\Controllers\Controller;

class ChatController extends Controller
{
    public function sendMessage(Request $request)
    {
        $request->validate([
            'chat_id' => 'required|string',
            'text' => 'required|string',
        ]);

        $user = $request->user();

        $message = [
            'sender_id' => $user->id,
            'text' => $request->text,
            'created_at' => now()->toDateTimeString(),
        ];

        // Broadcast event realtime
        broadcast(new ChatMessage($request->chat_id, $message))->toOthers();

        return response()->json([
            'success' => true,
            'message' => $message,
        ]);
    }
}
