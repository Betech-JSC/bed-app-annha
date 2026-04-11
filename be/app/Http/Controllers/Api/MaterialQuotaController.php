<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\MaterialQuota;
use App\Services\MaterialQuotaService;
use App\Constants\Permissions;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MaterialQuotaController extends Controller
{
    use ApiAuthorization;

    public function __construct(private MaterialQuotaService $quotaService) {}

    /**
     * GET /api/projects/{projectId}/materials/inventory
     */
    public function inventory(Request $request, int $projectId): JsonResponse
    {
        $this->apiRequire($request->user(), Permissions::MATERIAL_VIEW, $projectId);

        $data = $this->quotaService->getInventory($projectId);
        return response()->json(['success' => true, 'data' => $data]);
    }

    /**
     * GET /api/projects/{projectId}/materials/quotas
     */
    public function quotas(Request $request, int $projectId): JsonResponse
    {
        $this->apiRequire($request->user(), Permissions::MATERIAL_VIEW, $projectId);

        $data = $this->quotaService->getQuotas($projectId);
        return response()->json(['success' => true, 'data' => $data]);
    }

    /**
     * POST /api/projects/{projectId}/materials/quotas
     */
    public function storeQuota(Request $request, int $projectId): JsonResponse
    {
        $this->apiRequire($request->user(), Permissions::MATERIAL_CREATE, $projectId);

        $validated = $request->validate([
            'material_id'      => 'required|exists:materials,id',
            'task_id'          => 'nullable|exists:project_tasks,id',
            'planned_quantity' => 'required|numeric|min:0',
            'unit'             => 'nullable|string|max:30',
            'notes'            => 'nullable|string',
        ]);

        $quota = MaterialQuota::create([
            ...$validated,
            'project_id' => $projectId,
            'created_by' => auth()->id(),
        ]);

        return response()->json(['success' => true, 'data' => $quota->load(['material', 'task'])], 201);
    }

    /**
     * PUT /api/projects/{projectId}/materials/quotas/{id}
     */
    public function updateQuota(Request $request, int $projectId, int $id): JsonResponse
    {
        $this->apiRequire($request->user(), Permissions::MATERIAL_UPDATE, $projectId);

        $quota = MaterialQuota::where('project_id', $projectId)->findOrFail($id);

        $validated = $request->validate([
            'planned_quantity' => 'sometimes|numeric|min:0',
            'unit'             => 'nullable|string|max:30',
            'notes'            => 'nullable|string',
        ]);

        $quota->update($validated);

        return response()->json(['success' => true, 'data' => $quota->fresh(['material', 'task'])]);
    }

    /**
     * GET /api/projects/{projectId}/materials/warnings
     */
    public function warnings(Request $request, int $projectId): JsonResponse
    {
        $this->apiRequire($request->user(), Permissions::MATERIAL_VIEW, $projectId);

        $data = $this->quotaService->getWarnings($projectId);
        return response()->json(['success' => true, 'data' => $data]);
    }

    /**
     * POST /api/projects/{projectId}/materials/import
     */
    public function importMaterial(Request $request, int $projectId): JsonResponse
    {
        $this->apiRequire($request->user(), Permissions::MATERIAL_CREATE, $projectId);

        $validated = $request->validate([
            'material_id'        => 'required|exists:materials,id',
            'quantity'           => 'required|numeric|min:0.001',
            'unit_price'         => 'nullable|numeric|min:0',
            'supplier_id'        => 'nullable|exists:suppliers,id',
            'reference_number'   => 'nullable|string',
            'transaction_date'   => 'nullable|date',
            'warehouse_location' => 'nullable|string|max:100',
            'batch_number'       => 'nullable|string|max:50',
            'notes'              => 'nullable|string',
        ]);

        $transaction = $this->quotaService->importMaterial($projectId, [
            ...$validated,
            'created_by' => auth()->id(),
        ]);

        return response()->json(['success' => true, 'data' => $transaction], 201);
    }

    /**
     * POST /api/projects/{projectId}/materials/export
     */
    public function exportMaterial(Request $request, int $projectId): JsonResponse
    {
        $this->apiRequire($request->user(), Permissions::MATERIAL_CREATE, $projectId);

        $validated = $request->validate([
            'material_id'        => 'required|exists:materials,id',
            'quantity'           => 'required|numeric|min:0.001',
            'unit_price'         => 'nullable|numeric|min:0',
            'reference_number'   => 'nullable|string',
            'transaction_date'   => 'nullable|date',
            'warehouse_location' => 'nullable|string|max:100',
            'batch_number'       => 'nullable|string|max:50',
            'notes'              => 'nullable|string',
        ]);

        try {
            $transaction = $this->quotaService->exportMaterial($projectId, [
                ...$validated,
                'created_by' => auth()->id(),
            ]);
            return response()->json(['success' => true, 'data' => $transaction], 201);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 422);
        }
    }

    /**
     * GET /api/projects/{projectId}/materials/history
     */
    public function history(Request $request, int $projectId): JsonResponse
    {
        $this->apiRequire($request->user(), Permissions::MATERIAL_VIEW, $projectId);
        $materialId = $request->query('material_id');
        $data = $this->quotaService->getHistory($projectId, $materialId);
        return response()->json(['success' => true, 'data' => $data]);
    }

    /**
     * POST /api/projects/{projectId}/materials/sync-inventory
     */
    public function syncInventory(Request $request, int $projectId): JsonResponse
    {
        $this->apiRequire($request->user(), Permissions::MATERIAL_UPDATE, $projectId);

        $this->quotaService->syncAllInventory($projectId);
        $this->quotaService->syncAllQuotas($projectId);

        return response()->json(['success' => true, 'message' => 'Đã đồng bộ tồn kho và định mức']);
    }
}
