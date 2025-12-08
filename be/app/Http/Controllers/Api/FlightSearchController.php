<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Flight;
use Illuminate\Http\Request;

class FlightSearchController extends Controller
{
    public function index(Request $request)
    {
        $request->validate([
            'from_airport' => 'nullable|string|size:3',
            'to_airport'   => 'nullable|string|size:3',
            'date'         => 'nullable|date',
            'item_type'    => 'nullable',
            'item_value'   => 'nullable',
        ]);

        $query = Flight::with(['customer'])
            ->where('verified', true);
        // ->where('flight_date', '>=', now()->subDay())
        // ->whereRaw('max_weight - booked_weight >= 0.5');

        // 1. Sân bay đi (bắt buộc)
        if ($request->filled('from_airport')) {
            $query->where('from_airport', strtoupper($request->from_airport));
        }

        // 2. Sân bay đến (bắt buộc)
        if ($request->filled('to_airport')) {
            $query->where('to_airport', strtoupper($request->to_airport));
        }

        // 3. Ngày bay (±1 ngày để tăng kết quả)
        // if ($request->filled('date')) {
        //     $date = \Carbon\Carbon::parse($request->date);
        //     $query->whereBetween('flight_date', [
        //         $date->clone()->subDay(),
        //         $date->clone()->addDay()
        //     ]);
        // }

        // Filter theo loại hàng (enum chính xác)
        if ($request->filled('item_type')) {
            $query->where('item_type', $request->item_type);
        }

        // Filter chính xác theo giá trị món hàng
        if ($request->filled('item_value')) {
            $query->where('item_value', $request->item_value);
        }

        // Phân trang
        $flights = $query->paginate(9)
            ->through(fn($item) => $item->transform())
            ->withQueryString();

        return response()->json([
            'success' => true,
            'message' => 'Tìm thấy ' . $flights->total() . ' hành khách phù hợp',
            'data'    => $flights,
        ]);
    }
}
