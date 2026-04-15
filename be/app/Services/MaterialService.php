<?php

namespace App\Services;

use App\Models\Material;
use App\Models\MaterialBill;
use App\Models\MaterialBillItem;
use App\Models\Project;
use Illuminate\Support\Facades\DB;

class MaterialService
{
    /**
     * Get materials with filtering
     */
    public function getMaterials(array $filters = []): \Illuminate\Contracts\Pagination\LengthAwarePaginator
    {
        $query = Material::query();

        if (!empty($filters['active_only']) && ($filters['active_only'] === 'true' || $filters['active_only'] === true)) {
            $query->where('status', 'active');
        }

        if (!empty($filters['search'])) {
            $search = $filters['search'];
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('code', 'like', "%{$search}%")
                    ->orWhere('category', 'like', "%{$search}%");
            });
        }

        if (!empty($filters['category'])) {
            $query->where('category', $filters['category']);
        }

        return $query->paginate(50);
    }

    /**
     * Get materials used in a project with detailed usage stats
     */
    public function getMaterialsByProject(int $projectId, array $filters = []): array
    {
        // 1. Get base material query
        $query = Material::whereHas('billItems.materialBill', function ($q) use ($projectId) {
            $q->where('project_id', $projectId)
              ->whereNotIn('status', ['rejected']);
        });

        if (!empty($filters['search'])) {
            $search = $filters['search'];
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('code', 'like', "%{$search}%")
                    ->orWhere('category', 'like', "%{$search}%");
            });
        }

        if (!empty($filters['category'])) {
            $query->where('category', $filters['category']);
        }

        $materials = $query->paginate(50);

        // 2. Calculate detail stats for current page materials
        $materials->getCollection()->transform(function ($material) use ($projectId) {
            $billItems = MaterialBillItem::where('material_id', $material->id)
                ->whereHas('materialBill', function ($q) use ($projectId) {
                    $q->where('project_id', $projectId)
                      ->whereNotIn('status', ['rejected']);
                })
                ->with('materialBill:id,status')
                ->get();

            $totalQuantity = $billItems->sum('quantity');
            $totalAmount = $billItems->sum('total_price');
            $approvedAmount = $billItems->filter(fn($item) => $item->materialBill->status === 'approved')->sum('total_price');
            $billsCount = $billItems->pluck('material_bill_id')->unique()->count();

            $material->project_usage = $totalQuantity;
            $material->project_total_amount = $totalAmount;
            $material->project_approved_amount = $approvedAmount;
            $material->project_pending_amount = $totalAmount - $approvedAmount;
            $material->project_transactions_count = $billsCount;

            return $material;
        });

        // 3. Calculate global project stats
        $globalStats = MaterialBill::where('project_id', $projectId)
            ->whereNotIn('status', ['rejected'])
            ->selectRaw("
                COUNT(*) as total_bills,
                SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved_bills,
                SUM(CASE WHEN status IN ('pending_management', 'pending_accountant', 'pending') THEN 1 ELSE 0 END) as pending_bills,
                SUM(CASE WHEN status = 'draft' THEN 1 ELSE 0 END) as draft_bills,
                SUM(total_amount) as total_material_cost,
                SUM(CASE WHEN status = 'approved' THEN total_amount ELSE 0 END) as approved_material_cost,
                SUM(CASE WHEN status IN ('pending_management', 'pending_accountant', 'pending', 'draft') THEN total_amount ELSE 0 END) as pending_material_cost
            ")
            ->first();

        return [
            'materials' => $materials,
            'summary' => [
                'total_material_cost' => (float)($globalStats->total_material_cost ?? 0),
                'approved_material_cost' => (float)($globalStats->approved_material_cost ?? 0),
                'pending_material_cost' => (float)($globalStats->pending_material_cost ?? 0),
                'total_materials_count' => $materials->total(),
                'total_bills' => (int)($globalStats->total_bills ?? 0),
                'approved_bills' => (int)($globalStats->approved_bills ?? 0),
                'pending_bills' => (int)($globalStats->pending_bills ?? 0),
                'draft_bills' => (int)($globalStats->draft_bills ?? 0),
            ]
        ];
    }
}
