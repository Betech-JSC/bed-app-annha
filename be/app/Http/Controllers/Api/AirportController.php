<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Airport;
use Illuminate\Http\Request;
use App\Helpers\ApiResponse;

class AirportController extends Controller
{
    /**
     * GET /api/airports
     * Lấy danh sách sân bay (có phân trang)
     */
    public function index(Request $request)
    {
        $airports = cache()->remember('vietnam_airports', now()->addDay(), function () {
            return Airport::where('country', 'Vietnam')
                ->orWhere('country', 'VN')
                ->orWhere('country', 'Việt Nam')
                ->orderBy('code')
                ->get()
                ->map(fn($airport) => [
                    'id'           => $airport->id,
                    'code'         => $airport->code,
                    'city_code'    => $airport->city_code,
                    'name_vi'      => $airport->name_vi,
                    'name_en'      => $airport->name_en,
                    'timezone'     => $airport->timezone,
                    'country'      => $airport->country,
                    'display_vi'   => $airport->name_vi . " ({$airport->code})",
                    'display_en'   => $airport->name_en . " ({$airport->code})",
                ]);
        });

        return ApiResponse::success($airports, 'Lấy danh sách sân bay thành công');
    }

    /**
     * GET /api/airports/search?q=sg
     * Tìm kiếm sân bay (dùng cho autocomplete)
     */
    public function search(Request $request)
    {
        $keyword = trim($request->get('q', ''));

        if (strlen($keyword) < 2) {
            return ApiResponse::error(null, 'Từ khóa phải có ít nhất 2 ký tự', 400);
        }

        $airports = Airport::where('code', 'LIKE', "%{$keyword}%")
            ->orWhere('name_vi', 'LIKE', "%{$keyword}%")
            ->orWhere('name_en', 'LIKE', "%{$keyword}%")
            ->orWhere('city_code', 'LIKE', "%{$keyword}%")
            ->orderByRaw("
                CASE 
                    WHEN code LIKE ? THEN 1
                    WHEN name_vi LIKE ? THEN 2  
                    WHEN name_en LIKE ? THEN 3
                    ELSE 4 
                END
            ", ["{$keyword}%", "{$keyword}%", "{$keyword}%"])
            ->limit(20)
            ->get()
            ->map(function ($airport) {
                return [
                    'id'            => $airport->id,
                    'code'          => $airport->code,
                    'city_code'     => $airport->city_code,
                    'name_vi'       => $airport->name_vi,
                    'name_en'       => $airport->name_en,
                    'timezone'      => $airport->timezone,
                    'display_vi'    => "{$airport->name_vi} ({$airport->code})",
                    'display_en'    => "{$airport->name_en} ({$airport->code})",
                ];
            });

        return ApiResponse::success($airports, 'Tìm kiếm thành công');
    }

    /**
     * GET /api/airports/{code}
     * Lấy chi tiết 1 sân bay theo code (SGN, HAN, DAD...)
     */
    public function show($code)
    {
        try {
            $airport = Airport::where('code', strtoupper($code))->firstOrFail();

            $data = [
                'id'            => $airport->id,
                'code'          => $airport->code,
                'city_code'     => $airport->city_code,
                'name_vi'       => $airport->name_vi,
                'name_en'       => $airport->name_en,
                'timezone'      => $airport->timezone,
                'display_vi'    => "{$airport->name_vi} ({$airport->code})",
                'display_en'    => "{$airport->name_en} ({$airport->code})",
            ];

            return ApiResponse::success($data, 'Lấy thông tin sân bay thành công');
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return ApiResponse::error(null, 'Không tìm thấy sân bay với mã: ' . strtoupper($code), 404);
        }
    }
}
