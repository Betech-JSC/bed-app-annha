<?php

namespace App\Http\Controllers;

use App\Models\Region;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Illuminate\Support\Facades\Request;
use Inertia\Response;

class RegionsController extends Controller
{
    /**
     * Display a listing of the regions.
     *
     * @return \Inertia\Response
     */
    public function index(): Response
    {
        // Fetch regions with necessary fields and paginate
        $regions = Region::select('id', 'name', 'level', 'code', 'parent_code', 'type', 'name_with_type', 'path', 'path_with_type', 'sort', 'shipping_price')
            ->orderBy('name')
            ->paginate(10);

        return Inertia::render('Regions/Index', [
            'filters' => Request::all('search', 'trashed'),
            'regions' => $regions,
        ]);
    }

    /**
     * Show the form for creating a new region.
     *
     * @return \Inertia\Response
     */
    public function create(): Response
    {
        return Inertia::render('Regions/Create');
    }

    /**
     * Store a newly created region in the database.
     *
     * @return RedirectResponse
     */
    public function store(): RedirectResponse
    {
        request()->validate([
            'country_id' => 'required|integer',
            'level' => 'required|integer',
            'code' => 'required|string|max:30|unique:regions,code',
            'parent_code' => 'nullable|string|max:30',
            'type' => 'nullable|string|max:30',
            'name' => 'required|string|max:100',
            'name_with_type' => 'nullable|string|max:150',
            'path' => 'nullable|string|max:255',
            'path_with_type' => 'nullable|string',
            'sort' => 'nullable|integer',
            'shipping_price' => 'nullable|numeric',
        ]);

        Region::create(request()->all());

        return redirect()->route('regions.index')->with('success', 'Region created.');
    }

    /**
     * Show the form for editing the specified region.
     *
     * @param  \App\Models\Region  $region
     * @return \Inertia\Response
     */
    public function edit(Region $region): Response
    {
        return Inertia::render('Regions/Edit', [
            'region' => $region,
        ]);
    }

    /**
     * Update the specified region in the database.
     *
     * @param  \App\Models\Region  $region
     * @return RedirectResponse
     */
    public function update(Region $region): RedirectResponse
    {
        request()->validate([
            'country_id' => 'required|integer',
            'level' => 'required|integer',
            'code' => 'required|string|max:30|unique:regions,code,' . $region->id,
            'parent_code' => 'nullable|string|max:30',
            'type' => 'nullable|string|max:30',
            'name' => 'required|string|max:100',
            'name_with_type' => 'nullable|string|max:150',
            'path' => 'nullable|string|max:255',
            'path_with_type' => 'nullable|string',
            'sort' => 'nullable|integer',
            'shipping_price' => 'nullable|numeric',
        ]);

        $region->update(request()->all());

        return redirect()->route('regions.index')->with('success', 'Region updated.');
    }

    /**
     * Remove the specified region from the database.
     *
     * @param  \App\Models\Region  $region
     * @return RedirectResponse
     */
    public function destroy(Region $region): RedirectResponse
    {
        $region->delete();

        return redirect()->route('regions.index')->with('success', 'Region deleted.');
    }
}
