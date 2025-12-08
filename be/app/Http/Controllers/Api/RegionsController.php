<?php

namespace App\Http\Controllers\Api;

use App\Models\Region;
use App\Http\Controllers\Controller;
use App\Helpers\ApiResponse;

class RegionsController extends Controller
{
    public function index()
    {
        $items = Region::query()
            ->get()
            ->map(fn($item) => $item->transform());

        return ApiResponse::success($items, 'Regions retrieved successfully');
    }
}
