<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Airport;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use App\Helpers\ApiResponse;

class AdminAirportController extends Controller
{
    /**
     * Danh sách sân bay
     */
    public function index(Request $request)
    {
        $query = Airport::query();

        // Search
        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('code', 'like', "%{$search}%")
                    ->orWhere('city_code', 'like', "%{$search}%")
                    ->orWhere('name_vi', 'like', "%{$search}%")
                    ->orWhere('name_en', 'like', "%{$search}%");
            });
        }

        // Filter theo country
        if ($request->has('country') && $request->country) {
            $query->where('country', $request->country);
        }

        // Filter theo city_code
        if ($request->has('city_code') && $request->city_code) {
            $query->where('city_code', $request->city_code);
        }

        // Sort
        $sortBy = $request->get('sort_by', 'code');
        $sortOrder = $request->get('sort_order', 'asc');
        $query->orderBy($sortBy, $sortOrder);

        // Pagination
        $perPage = $request->get('per_page', 15);
        $airports = $query->paginate($perPage);

        return ApiResponse::success($airports, 'Lấy danh sách sân bay thành công');
    }

    /**
     * Chi tiết sân bay
     */
    public function show($id)
    {
        $airport = Airport::findOrFail($id);

        return ApiResponse::success($airport, 'Lấy thông tin sân bay thành công');
    }

    /**
     * Tạo mới sân bay
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'code' => 'required|string|max:10|unique:airports,code',
            'city_code' => 'nullable|string|max:10',
            'name_vi' => 'required|string|max:255',
            'name_en' => 'nullable|string|max:255',
            'timezone' => 'nullable|string|max:50',
            'country' => 'nullable|string|max:255',
        ]);

        $airport = Airport::create([
            'code' => strtoupper($validated['code']),
            'city_code' => isset($validated['city_code']) ? strtoupper($validated['city_code']) : null,
            'name_vi' => $validated['name_vi'],
            'name_en' => $validated['name_en'] ?? null,
            'timezone' => $validated['timezone'] ?? null,
            'country' => $validated['country'] ?? 'Vietnam',
        ]);

        // Clear cache
        Cache::forget('vietnam_airports');
        Cache::forget('airports');

        return ApiResponse::success($airport, 'Tạo sân bay thành công', 201);
    }

    /**
     * Cập nhật sân bay
     */
    public function update(Request $request, $id)
    {
        $airport = Airport::findOrFail($id);

        $validated = $request->validate([
            'code' => 'required|string|max:10|unique:airports,code,' . $id,
            'city_code' => 'nullable|string|max:10',
            'name_vi' => 'required|string|max:255',
            'name_en' => 'nullable|string|max:255',
            'timezone' => 'nullable|string|max:50',
            'country' => 'nullable|string|max:255',
        ]);

        $airport->update([
            'code' => strtoupper($validated['code']),
            'city_code' => isset($validated['city_code']) ? strtoupper($validated['city_code']) : null,
            'name_vi' => $validated['name_vi'],
            'name_en' => $validated['name_en'] ?? null,
            'timezone' => $validated['timezone'] ?? null,
            'country' => $validated['country'] ?? null,
        ]);

        // Clear cache
        Cache::forget('vietnam_airports');
        Cache::forget('airports');

        return ApiResponse::success($airport->fresh(), 'Cập nhật sân bay thành công');
    }

    /**
     * Xóa sân bay
     */
    public function destroy($id)
    {
        $airport = Airport::findOrFail($id);

        // Kiểm tra xem có chuyến bay nào đang sử dụng sân bay này không
        $flightsCount = \App\Models\Flight::where('from_airport', $airport->code)
            ->orWhere('to_airport', $airport->code)
            ->count();

        if ($flightsCount > 0) {
            return ApiResponse::error(
                null,
                "Không thể xóa sân bay vì có {$flightsCount} chuyến bay đang sử dụng",
                400
            );
        }

        $airport->delete();

        // Clear cache
        Cache::forget('vietnam_airports');
        Cache::forget('airports');

        return ApiResponse::success(null, 'Xóa sân bay thành công');
    }
}

