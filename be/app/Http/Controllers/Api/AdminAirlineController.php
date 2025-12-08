<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Airline;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use App\Helpers\ApiResponse;

class AdminAirlineController extends Controller
{
    /**
     * Danh sách hãng hàng không
     */
    public function index(Request $request)
    {
        $query = Airline::query();

        // Search
        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('iata_code', 'like', "%{$search}%")
                    ->orWhere('icao_code', 'like', "%{$search}%")
                    ->orWhere('name_vi', 'like', "%{$search}%")
                    ->orWhere('name_en', 'like', "%{$search}%");
            });
        }

        // Filter theo status
        if ($request->has('status') && $request->status) {
            $query->where('status', $request->status);
        }

        // Filter theo country
        if ($request->has('country') && $request->country) {
            $query->where('country', $request->country);
        }

        // Sort
        $sortBy = $request->get('sort_by', 'name_vi');
        $sortOrder = $request->get('sort_order', 'asc');
        $query->orderBy($sortBy, $sortOrder);

        // Pagination
        $perPage = $request->get('per_page', 15);
        $airlines = $query->paginate($perPage);

        return ApiResponse::success($airlines, 'Lấy danh sách hãng hàng không thành công');
    }

    /**
     * Chi tiết hãng hàng không
     */
    public function show($id)
    {
        $airline = Airline::findOrFail($id);

        return ApiResponse::success($airline, 'Lấy thông tin hãng hàng không thành công');
    }

    /**
     * Tạo mới hãng hàng không
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'iata_code' => 'required|string|max:5|unique:airlines,iata_code',
            'icao_code' => 'nullable|string|max:5|unique:airlines,icao_code',
            'name_vi' => 'required|string|max:255',
            'name_en' => 'nullable|string|max:255',
            'call_sign' => 'nullable|string|max:255',
            'headquarter_city' => 'nullable|string|max:255',
            'country' => 'nullable|string|max:255',
            'website' => 'nullable|url|max:255',
            'logo_url' => 'nullable|url|max:500',
            'status' => 'nullable|string|in:active,inactive',
        ]);

        $airline = Airline::create([
            'iata_code' => strtoupper($validated['iata_code']),
            'icao_code' => isset($validated['icao_code']) ? strtoupper($validated['icao_code']) : null,
            'name_vi' => $validated['name_vi'],
            'name_en' => $validated['name_en'] ?? null,
            'call_sign' => $validated['call_sign'] ?? null,
            'headquarter_city' => $validated['headquarter_city'] ?? null,
            'country' => $validated['country'] ?? 'Vietnam',
            'website' => $validated['website'] ?? null,
            'logo_url' => $validated['logo_url'] ?? null,
            'status' => $validated['status'] ?? 'active',
        ]);

        // Clear cache
        Cache::forget('vn_airlines_all');
        Cache::forget('airlines');

        return ApiResponse::success($airline, 'Tạo hãng hàng không thành công', 201);
    }

    /**
     * Cập nhật hãng hàng không
     */
    public function update(Request $request, $id)
    {
        $airline = Airline::findOrFail($id);

        $validated = $request->validate([
            'iata_code' => 'required|string|max:5|unique:airlines,iata_code,' . $id,
            'icao_code' => 'nullable|string|max:5|unique:airlines,icao_code,' . $id,
            'name_vi' => 'required|string|max:255',
            'name_en' => 'nullable|string|max:255',
            'call_sign' => 'nullable|string|max:255',
            'headquarter_city' => 'nullable|string|max:255',
            'country' => 'nullable|string|max:255',
            'website' => 'nullable|url|max:255',
            'logo_url' => 'nullable|url|max:500',
            'status' => 'nullable|string|in:active,inactive',
        ]);

        $airline->update([
            'iata_code' => strtoupper($validated['iata_code']),
            'icao_code' => isset($validated['icao_code']) ? strtoupper($validated['icao_code']) : null,
            'name_vi' => $validated['name_vi'],
            'name_en' => $validated['name_en'] ?? null,
            'call_sign' => $validated['call_sign'] ?? null,
            'headquarter_city' => $validated['headquarter_city'] ?? null,
            'country' => $validated['country'] ?? null,
            'website' => $validated['website'] ?? null,
            'logo_url' => $validated['logo_url'] ?? null,
            'status' => $validated['status'] ?? null,
        ]);

        // Clear cache
        Cache::forget('vn_airlines_all');
        Cache::forget('airlines');

        return ApiResponse::success($airline->fresh(), 'Cập nhật hãng hàng không thành công');
    }

    /**
     * Xóa hãng hàng không
     */
    public function destroy($id)
    {
        $airline = Airline::findOrFail($id);

        // Kiểm tra xem có chuyến bay nào đang sử dụng hãng này không
        $flightsCount = \App\Models\Flight::where('airline', $airline->name_vi)
            ->orWhere('airline', $airline->iata_code)
            ->count();

        if ($flightsCount > 0) {
            return ApiResponse::error(
                null,
                "Không thể xóa hãng hàng không vì có {$flightsCount} chuyến bay đang sử dụng",
                400
            );
        }

        $airline->delete();

        // Clear cache
        Cache::forget('vn_airlines_all');
        Cache::forget('airlines');

        return ApiResponse::success(null, 'Xóa hãng hàng không thành công');
    }
}

