<?php

namespace App\Http\Controllers\Api;

use App\Constants\Permissions;
use App\Http\Controllers\Controller;
use App\Models\Kpi;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class KpiController extends Controller
{
    public function index(Request $request, $projectId)
    {
        $user = $request->user();
        if (!$user->hasPermission(Permissions::KPI_VIEW) && !$user->hasPermission(Permissions::PERSONNEL_VIEW)) {
            // Allow if user is personnel in project? 
            // For now, strict permission check.
             return response()->json(['message' => 'Unauthorized'], 403);
        }

        $query = Kpi::where('project_id', $projectId)
            ->with(['user:id,name,email,image', 'creator:id,name']);

        if ($request->has('user_id')) {
            $query->where('user_id', $request->user_id);
        }

        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        // Filter based on role?
        // If not manager/view_all, only see own KPIs?
        if (!$user->hasPermission(Permissions::KPI_VIEW)) {
             $query->where('user_id', $user->id);
        }

        $kpis = $query->orderBy('created_at', 'desc')->get();

        return response()->json([
            'success' => true,
            'data' => $kpis
        ]);
    }

    public function store(Request $request, $projectId)
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
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
        ]);

        $kpi = Kpi::create([
            'project_id' => $projectId,
            'user_id' => $validated['user_id'],
            'title' => $validated['title'],
            'description' => $validated['description'],
            'target_value' => $validated['target_value'],
            'current_value' => 0,
            'unit' => $validated['unit'],
            'status' => 'pending',
            'start_date' => $validated['start_date'],
            'end_date' => $validated['end_date'],
            'created_by' => $user->id,
        ]);

        return response()->json([
            'success' => true,
            'data' => $kpi
        ]);
    }

    public function show(Request $request, $projectId, $id)
    {
        $kpi = Kpi::where('project_id', $projectId)
            ->with(['user:id,name,email,image', 'creator:id,name'])
            ->findOrFail($id);

        return response()->json([
            'success' => true,
            'data' => $kpi
        ]);
    }

    public function update(Request $request, $projectId, $id)
    {
        $kpi = Kpi::where('project_id', $projectId)->findOrFail($id);
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
                'start_date' => 'nullable|date',
                'end_date' => 'nullable|date|after_or_equal:start_date',
            ]);
        }

        $validated = $request->validate($rules);

        // If user is owner but not manager, they can ONLY update current_value (progress)
        if ($isOwner && !$canManage) {
            // Only update current_value
            if (isset($validated['current_value'])) {
                $kpi->current_value = $validated['current_value'];
                
                // Logic: If reaches 100%, maybe notify manager? 
                // But status update to 'completed' (waiting verification) should be manual request?
                // Or auto if current >= target?
                if ($kpi->current_value >= $kpi->target_value) {
                     // Auto mark as completed/waiting verification?
                     // Requirement: "Nhân sự báo cáo hoàn thành 100% KPI"
                     // Let's assume hitting target = report completion
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

    public function destroy(Request $request, $projectId, $id)
    {
        if (!$request->user()->hasPermission(Permissions::KPI_DELETE)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $kpi = Kpi::where('project_id', $projectId)->findOrFail($id);
        $kpi->delete();

        return response()->json([
            'success' => true,
            'message' => 'KPI deleted successfully'
        ]);
    }

    public function verify(Request $request, $projectId, $id)
    {
        if (!$request->user()->hasPermission(Permissions::KPI_VERIFY)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $kpi = Kpi::where('project_id', $projectId)->findOrFail($id);

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
