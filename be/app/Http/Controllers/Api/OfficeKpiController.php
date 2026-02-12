<?php

namespace App\Http\Controllers\Api;

use App\Constants\Permissions;
use App\Http\Controllers\Controller;
use App\Models\Kpi;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class OfficeKpiController extends Controller
{
    /**
     * Get all office KPIs (not tied to any project)
     */
    public function index(Request $request)
    {
        $user = $request->user();
        if (!$user->hasPermission(Permissions::KPI_VIEW) && !$user->hasPermission(Permissions::HR_EMPLOYEE_VIEW)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $query = Kpi::whereNull('project_id')
            ->with(['user:id,name,email,image', 'creator:id,name']);

        if ($request->has('user_id')) {
            $query->where('user_id', $request->user_id);
        }

        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        if ($request->has('year')) {
            $query->where('year', $request->year);
        }

        // If not manager/view_all, only see own KPIs
        if (!$user->hasPermission(Permissions::KPI_VIEW)) {
             $query->where('user_id', $user->id);
        }

        $kpis = $query->orderBy('created_at', 'desc')->get();

        return response()->json([
            'success' => true,
            'data' => $kpis
        ]);
    }

    /**
     * Create a new office KPI
     */
    public function store(Request $request)
    {
        $user = $request->user();
        if (!$user->hasPermission(Permissions::KPI_CREATE)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'user_id' => 'required|exists:users,id',
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'target_value' => 'required|numeric|min:0',
            'unit' => 'required|string|max:50',
            'year' => 'nullable|integer|min:2020|max:2100',
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
        ]);

        $kpi = Kpi::create([
            'project_id' => null, // Office KPI - not tied to project
            'user_id' => $validated['user_id'],
            'title' => $validated['title'],
            'description' => $validated['description'],
            'target_value' => $validated['target_value'],
            'current_value' => 0,
            'unit' => $validated['unit'],
            'status' => 'pending',
            'year' => $validated['year'] ?? null,
            'start_date' => $validated['start_date'] ?? null,
            'end_date' => $validated['end_date'] ?? null,
            'created_by' => $user->id,
        ]);

        return response()->json([
            'success' => true,
            'data' => $kpi
        ]);
    }

    /**
     * Get a specific office KPI
     */
    public function show(Request $request, $id)
    {
        $kpi = Kpi::whereNull('project_id')
            ->with(['user:id,name,email,image', 'creator:id,name'])
            ->findOrFail($id);

        return response()->json([
            'success' => true,
            'data' => $kpi
        ]);
    }

    /**
     * Update an office KPI
     */
    public function update(Request $request, $id)
    {
        $kpi = Kpi::whereNull('project_id')->findOrFail($id);
        $user = $request->user();

        // Check permission: Owner can update progress, Manager can update all
        $isOwner = $user->id === $kpi->user_id;
        $canManage = $user->hasPermission(Permissions::KPI_UPDATE);

        if (!$isOwner && !$canManage) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $rules = [
            'current_value' => 'sometimes|required|numeric|min:0',
        ];

        if ($canManage) {
            $rules = array_merge($rules, [
                'title' => 'sometimes|required|string|max:255',
                'description' => 'nullable|string',
                'target_value' => 'sometimes|required|numeric|min:0',
                'unit' => 'sometimes|required|string|max:50',
                'year' => 'nullable|integer|min:2020|max:2100',
                'start_date' => 'nullable|date',
                'end_date' => 'nullable|date|after_or_equal:start_date',
            ]);
        }

        $validated = $request->validate($rules);

        // If user is owner but not manager, they can ONLY update current_value (progress)
        if ($isOwner && !$canManage) {
            if (isset($validated['current_value'])) {
                $kpi->current_value = $validated['current_value'];
                
                if ($kpi->current_value >= $kpi->target_value) {
                     $kpi->status = 'completed'; 
                } else {
                    $kpi->status = 'pending';
                }
                $kpi->save();
            }
        } else {
            // Manager can update everything
            $kpi->update($validated);
        }

        return response()->json([
            'success' => true,
            'data' => $kpi
        ]);
    }

    /**
     * Delete an office KPI
     */
    public function destroy(Request $request, $id)
    {
        if (!$request->user()->hasPermission(Permissions::KPI_DELETE)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $kpi = Kpi::whereNull('project_id')->findOrFail($id);
        $kpi->delete();

        return response()->json([
            'success' => true,
            'message' => 'KPI deleted successfully'
        ]);
    }

    /**
     * Verify an office KPI (manager only)
     */
    public function verify(Request $request, $id)
    {
        if (!$request->user()->hasPermission(Permissions::KPI_VERIFY)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $kpi = Kpi::whereNull('project_id')->findOrFail($id);

        $validated = $request->validate([
            'status' => ['required', Rule::in(['verified_success', 'verified_fail', 'pending'])],
            'note' => 'nullable|string'
        ]);

        $kpi->status = $validated['status'];
        $kpi->save();

        return response()->json([
            'success' => true,
            'data' => $kpi
        ]);
    }
}
