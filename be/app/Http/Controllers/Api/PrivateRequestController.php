<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Flight;
use App\Models\Request as PrivateRequest;
use Illuminate\Http\Request;

class PrivateRequestController extends Controller
{
    public function store(Request $request)
    {
        $validated = $request->validate([
            'flight_id'           => 'required|exists:flights,id',
            'reward'              => 'required|numeric|min:50000|max:10000000',
            'item_value'          => 'required|numeric|min:100000',
            'item_description'    => 'required|string|max:1000',
            'time_slot' => 'required|in:morning,afternoon,evening,any',
            'note'                => 'nullable|string|max:500',
        ]);

        $flight = Flight::with('customer')->findOrFail($validated['flight_id']);

        // Kiểm tra hành khách còn chỗ không
        if (($flight->max_weight - $flight->booked_weight) < 0.5) {
            return response()->json(['message' => 'Hành khách đã hết chỗ mang thêm'], 400);
        }

        // Tránh gửi trùng
        $exists = PrivateRequest::where('sender_id', auth()->id())
            ->where('flight_id', $flight->id)
            ->where('status', 'pending')
            ->exists();

        if ($exists) {
            return response()->json(['message' => 'Bạn đã gửi yêu cầu cho hành khách này rồi'], 400);
        }

        $privateReq = PrivateRequest::create([
            'uuid'              => PrivateRequest::generateRequestUuid(),
            'sender_id'         => auth()->id(),
            'customer_id'       => $flight->customer_id,
            'flight_id'         => $flight->id,
            'reward'            => $validated['reward'],
            'item_value'        => $validated['item_value'],
            'item_description'  => $validated['item_description'],
            'time_slot' => $validated['time_slot'],
            'note'              => $validated['note'],
            'status'            => 'pending',
            'expires_at'        => now()->addHours(24),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Đã gửi yêu cầu thành công! Hành khách sẽ phản hồi trong 24h.',
            'data'    => $privateReq
        ], 200);
    }

    // Danh sách yêu cầu riêng đã gửi
    public function index()
    {
        $requests = PrivateRequest::with(['flight', 'customer'])
            ->where('sender_id', auth()->id())
            ->orderByDesc('created_at')
            ->paginate(20);

        return response()->json($requests);
    }
}
