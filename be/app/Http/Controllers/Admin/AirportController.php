<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Airport;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Request;
use Illuminate\Support\Facades\Cache;
use Inertia\Inertia;
use Inertia\Response;

class AirportController extends Controller
{
    /**
     * Danh sách sân bay
     */
    public function index(): Response
    {
        $query = Airport::query();

        // Search
        if (Request::has('search')) {
            $search = Request::get('search');
            $query->where(function ($q) use ($search) {
                $q->where('code', 'like', "%{$search}%")
                    ->orWhere('city_code', 'like', "%{$search}%")
                    ->orWhere('name_vi', 'like', "%{$search}%")
                    ->orWhere('name_en', 'like', "%{$search}%");
            });
        }

        // Filter theo country
        if (Request::has('country') && Request::get('country')) {
            $query->where('country', Request::get('country'));
        }

        // Filter theo city_code
        if (Request::has('city_code') && Request::get('city_code')) {
            $query->where('city_code', Request::get('city_code'));
        }

        // Sort
        $sortBy = Request::get('sort_by', 'code');
        $sortOrder = Request::get('sort_order', 'asc');
        $query->orderBy($sortBy, $sortOrder);

        // Pagination
        $perPage = Request::get('per_page', 15);
        $airports = $query->paginate($perPage)->appends(Request::all());

        return Inertia::render('Admin/Airports/Index', [
            'filters' => Request::only('search', 'country', 'city_code', 'sort_by', 'sort_order'),
            'airports' => $airports,
        ]);
    }

    /**
     * Form tạo mới
     */
    public function create(): Response
    {
        return Inertia::render('Admin/Airports/Create');
    }

    /**
     * Lưu sân bay mới
     */
    public function store(): RedirectResponse
    {
        Request::validate([
            'code' => 'required|string|max:10|unique:airports,code',
            'city_code' => 'nullable|string|max:10',
            'name_vi' => 'required|string|max:255',
            'name_en' => 'nullable|string|max:255',
            'timezone' => 'nullable|string|max:50',
            'country' => 'nullable|string|max:255|default:Vietnam',
        ]);

        $airport = Airport::create([
            'code' => strtoupper(Request::get('code')),
            'city_code' => Request::has('city_code') ? strtoupper(Request::get('city_code')) : null,
            'name_vi' => Request::get('name_vi'),
            'name_en' => Request::get('name_en'),
            'timezone' => Request::get('timezone'),
            'country' => Request::get('country', 'Vietnam'),
        ]);

        // Clear cache
        Cache::forget('vietnam_airports');
        Cache::forget('airports');

        return redirect()->route('admin.airports.index')
            ->with('success', 'Đã tạo sân bay thành công');
    }

    /**
     * Chi tiết sân bay
     */
    public function show($id): Response
    {
        $airport = Airport::findOrFail($id);

        return Inertia::render('Admin/Airports/Show', [
            'airport' => $airport,
        ]);
    }

    /**
     * Form chỉnh sửa
     */
    public function edit($id): Response
    {
        $airport = Airport::findOrFail($id);

        return Inertia::render('Admin/Airports/Edit', [
            'airport' => $airport,
        ]);
    }

    /**
     * Cập nhật sân bay
     */
    public function update($id): RedirectResponse
    {
        $airport = Airport::findOrFail($id);

        Request::validate([
            'code' => 'required|string|max:10|unique:airports,code,' . $id,
            'city_code' => 'nullable|string|max:10',
            'name_vi' => 'required|string|max:255',
            'name_en' => 'nullable|string|max:255',
            'timezone' => 'nullable|string|max:50',
            'country' => 'nullable|string|max:255',
        ]);

        $airport->update([
            'code' => strtoupper(Request::get('code')),
            'city_code' => Request::has('city_code') ? strtoupper(Request::get('city_code')) : null,
            'name_vi' => Request::get('name_vi'),
            'name_en' => Request::get('name_en'),
            'timezone' => Request::get('timezone'),
            'country' => Request::get('country'),
        ]);

        // Clear cache
        Cache::forget('vietnam_airports');
        Cache::forget('airports');

        return redirect()->route('admin.airports.index')
            ->with('success', 'Đã cập nhật sân bay thành công');
    }

    /**
     * Xóa sân bay
     */
    public function destroy($id): RedirectResponse
    {
        $airport = Airport::findOrFail($id);

        // Kiểm tra xem có chuyến bay nào đang sử dụng sân bay này không
        $flightsCount = \App\Models\Flight::where('from_airport', $airport->code)
            ->orWhere('to_airport', $airport->code)
            ->count();

        if ($flightsCount > 0) {
            return redirect()->back()
                ->with('error', "Không thể xóa sân bay vì có {$flightsCount} chuyến bay đang sử dụng");
        }

        $airport->delete();

        // Clear cache
        Cache::forget('vietnam_airports');
        Cache::forget('airports');

        return redirect()->route('admin.airports.index')
            ->with('success', 'Đã xóa sân bay thành công');
    }
}

