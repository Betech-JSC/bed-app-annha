<?php

namespace App\Http\Controllers\Api;

use App\Helpers\ApiResponse;
use App\Http\Controllers\Controller;
use App\Models\Airline;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Http\Request;

class AirlineController extends Controller
{
    /**
     * GET /api/airlines
     * Lấy danh sách hãng hàng không nội địa (cache 24h)
     */
    public function index()
    {
        $airlines = cache()->remember('vn_airlines_all', now()->addDay(), function () {
            return Airline::orderBy('name_vi')
                ->get()
                ->map(fn ($airline) => $this->transformAirline($airline));
        });

        return ApiResponse::success($airlines, 'Lấy danh sách hãng hàng không thành công');
    }

    /**
     * GET /api/airlines/search?q=vn
     * Tìm kiếm theo mã hoặc tên
     */
    public function search(Request $request)
    {
        $keyword = trim($request->get('q', ''));

        if (strlen($keyword) < 2) {
            return ApiResponse::error(null, 'Từ khóa phải có ít nhất 2 ký tự', 400);
        }

        $airlines = Airline::where('iata_code', 'LIKE', "%{$keyword}%")
            ->orWhere('icao_code', 'LIKE', "%{$keyword}%")
            ->orWhere('name_vi', 'LIKE', "%{$keyword}%")
            ->orWhere('name_en', 'LIKE', "%{$keyword}%")
            ->orderBy('name_vi')
            ->limit(20)
            ->get()
            ->map(fn ($airline) => $this->transformAirline($airline));

        return ApiResponse::success($airlines, 'Tìm kiếm hãng bay thành công');
    }

    /**
     * GET /api/airlines/{code}
     * Lấy chi tiết hãng hàng không theo mã IATA/ICAO
     */
    public function show(string $code)
    {
        try {
            $code = strtoupper($code);

            $airline = Airline::where('iata_code', $code)
                ->orWhere('icao_code', $code)
                ->firstOrFail();

            return ApiResponse::success($this->transformAirline($airline), 'Lấy thông tin hãng hàng không thành công');
        } catch (ModelNotFoundException $exception) {
            return ApiResponse::error(null, 'Không tìm thấy hãng hàng không với mã: ' . strtoupper($code), 404);
        }
    }

    /**
     * Chuẩn hóa cấu trúc trả về
     */
    private function transformAirline(Airline $airline): array
    {
        return [
            'id'               => $airline->id,
            'iata_code'        => $airline->iata_code,
            'icao_code'        => $airline->icao_code,
            'name_vi'          => $airline->name_vi,
            'name_en'          => $airline->name_en,
            'call_sign'        => $airline->call_sign,
            'headquarter_city' => $airline->headquarter_city,
            'country'          => $airline->country,
            'website'          => $airline->website,
            'logo_url'         => $airline->logo_url,
            'status'           => $airline->status,
        ];
    }
}

