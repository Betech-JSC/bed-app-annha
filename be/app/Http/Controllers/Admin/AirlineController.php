<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Airline;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Request;
use Illuminate\Support\Facades\Cache;
use Inertia\Inertia;
use Inertia\Response;

class AirlineController extends Controller
{
    /**
     * Danh sách hãng hàng không
     */
    public function index(): Response
    {
        $query = Airline::query();

        // Search
        if (Request::has('search')) {
            $search = Request::get('search');
            $query->where(function ($q) use ($search) {
                $q->where('iata_code', 'like', "%{$search}%")
                    ->orWhere('icao_code', 'like', "%{$search}%")
                    ->orWhere('name_vi', 'like', "%{$search}%")
                    ->orWhere('name_en', 'like', "%{$search}%");
            });
        }

        // Filter theo status
        if (Request::has('status') && Request::get('status')) {
            $query->where('status', Request::get('status'));
        }

        // Filter theo country
        if (Request::has('country') && Request::get('country')) {
            $query->where('country', Request::get('country'));
        }

        // Sort
        $sortBy = Request::get('sort_by', 'name_vi');
        $sortOrder = Request::get('sort_order', 'asc');
        $query->orderBy($sortBy, $sortOrder);

        // Pagination
        $perPage = Request::get('per_page', 15);
        $airlines = $query->paginate($perPage)->appends(Request::all());

        return Inertia::render('Admin/Airlines/Index', [
            'filters' => Request::only('search', 'status', 'country', 'sort_by', 'sort_order'),
            'airlines' => $airlines,
        ]);
    }

    /**
     * Form tạo mới
     */
    public function create(): Response
    {
        return Inertia::render('Admin/Airlines/Create');
    }

    /**
     * Lưu hãng hàng không mới
     */
    public function store(): RedirectResponse
    {
        Request::validate([
            'iata_code' => 'required|string|max:5|unique:airlines,iata_code',
            'icao_code' => 'nullable|string|max:5|unique:airlines,icao_code',
            'name_vi' => 'required|string|max:255',
            'name_en' => 'nullable|string|max:255',
            'call_sign' => 'nullable|string|max:255',
            'headquarter_city' => 'nullable|string|max:255',
            'country' => 'nullable|string|max:255|default:Vietnam',
            'website' => 'nullable|url|max:255',
            'logo_url' => 'nullable|url|max:500',
            'status' => 'nullable|string|in:active,inactive',
        ]);

        $airline = Airline::create([
            'iata_code' => strtoupper(Request::get('iata_code')),
            'icao_code' => Request::has('icao_code') ? strtoupper(Request::get('icao_code')) : null,
            'name_vi' => Request::get('name_vi'),
            'name_en' => Request::get('name_en'),
            'call_sign' => Request::get('call_sign'),
            'headquarter_city' => Request::get('headquarter_city'),
            'country' => Request::get('country', 'Vietnam'),
            'website' => Request::get('website'),
            'logo_url' => Request::get('logo_url'),
            'status' => Request::get('status', 'active'),
        ]);

        // Clear cache
        Cache::forget('vn_airlines_all');
        Cache::forget('airlines');

        return redirect()->route('admin.airlines.index')
            ->with('success', 'Đã tạo hãng hàng không thành công');
    }

    /**
     * Chi tiết hãng hàng không
     */
    public function show($id): Response
    {
        $airline = Airline::findOrFail($id);

        return Inertia::render('Admin/Airlines/Show', [
            'airline' => $airline,
        ]);
    }

    /**
     * Form chỉnh sửa
     */
    public function edit($id): Response
    {
        $airline = Airline::findOrFail($id);

        return Inertia::render('Admin/Airlines/Edit', [
            'airline' => $airline,
        ]);
    }

    /**
     * Cập nhật hãng hàng không
     */
    public function update($id): RedirectResponse
    {
        $airline = Airline::findOrFail($id);

        Request::validate([
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
            'iata_code' => strtoupper(Request::get('iata_code')),
            'icao_code' => Request::has('icao_code') ? strtoupper(Request::get('icao_code')) : null,
            'name_vi' => Request::get('name_vi'),
            'name_en' => Request::get('name_en'),
            'call_sign' => Request::get('call_sign'),
            'headquarter_city' => Request::get('headquarter_city'),
            'country' => Request::get('country'),
            'website' => Request::get('website'),
            'logo_url' => Request::get('logo_url'),
            'status' => Request::get('status'),
        ]);

        // Clear cache
        Cache::forget('vn_airlines_all');
        Cache::forget('airlines');

        return redirect()->route('admin.airlines.index')
            ->with('success', 'Đã cập nhật hãng hàng không thành công');
    }

    /**
     * Xóa hãng hàng không
     */
    public function destroy($id): RedirectResponse
    {
        $airline = Airline::findOrFail($id);

        // Kiểm tra xem có chuyến bay nào đang sử dụng hãng này không
        $flightsCount = \App\Models\Flight::where('airline', $airline->name_vi)
            ->orWhere('airline', $airline->iata_code)
            ->count();

        if ($flightsCount > 0) {
            return redirect()->back()
                ->with('error', "Không thể xóa hãng hàng không vì có {$flightsCount} chuyến bay đang sử dụng");
        }

        $airline->delete();

        // Clear cache
        Cache::forget('vn_airlines_all');
        Cache::forget('airlines');

        return redirect()->route('admin.airlines.index')
            ->with('success', 'Đã xóa hãng hàng không thành công');
    }
}

