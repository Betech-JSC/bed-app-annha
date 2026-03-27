<?php

namespace App\Services;

use App\Models\Material;
use App\Models\MaterialInventory;
use App\Models\MaterialQuota;
use App\Models\MaterialTransaction;
use Illuminate\Support\Collection;

class MaterialQuotaService
{
    /**
     * Lấy định mức vật tư cho dự án
     */
    public function getQuotas(int $projectId): array
    {
        $quotas = MaterialQuota::where('project_id', $projectId)
            ->with(['material', 'task', 'creator'])
            ->orderBy('material_id')
            ->get();

        $totalPlanned = $quotas->sum('planned_quantity');
        $totalActual  = $quotas->sum('actual_quantity');
        $exceeded     = $quotas->filter(fn($q) => $q->is_exceeded)->count();
        $warning      = $quotas->filter(fn($q) => $q->usage_percentage >= 80 && !$q->is_exceeded)->count();

        return [
            'quotas'  => $quotas,
            'summary' => [
                'total_items'    => $quotas->count(),
                'exceeded_count' => $exceeded,
                'warning_count'  => $warning,
                'on_track_count' => $quotas->count() - $exceeded - $warning,
            ],
        ];
    }

    /**
     * Lấy tồn kho hiện tại cho dự án
     */
    public function getInventory(int $projectId): array
    {
        $inventory = MaterialInventory::where('project_id', $projectId)
            ->with('material')
            ->orderBy('material_id')
            ->get();

        // Nếu chưa có inventory records, tạo từ transactions
        if ($inventory->isEmpty()) {
            $this->syncAllInventory($projectId);
            $inventory = MaterialInventory::where('project_id', $projectId)
                ->with('material')
                ->get();
        }

        $lowStock    = $inventory->filter(fn($i) => $i->is_low_stock)->count();
        $outOfStock  = $inventory->filter(fn($i) => (float) $i->current_stock <= 0)->count();

        return [
            'inventory' => $inventory,
            'summary'   => [
                'total_items'     => $inventory->count(),
                'low_stock_count' => $lowStock,
                'out_of_stock'    => $outOfStock,
                'adequate'        => $inventory->count() - $lowStock - $outOfStock,
            ],
        ];
    }

    /**
     * Cảnh báo vượt định mức và hết tồn kho
     */
    public function getWarnings(int $projectId): array
    {
        $warnings = [];

        // Cảnh báo vượt định mức (>= 80% sử dụng)
        $quotaWarnings = MaterialQuota::where('project_id', $projectId)
            ->whereRaw('actual_quantity >= planned_quantity * 0.8')
            ->with(['material', 'task'])
            ->get();

        foreach ($quotaWarnings as $q) {
            $warnings[] = [
                'type'       => $q->is_exceeded ? 'quota_exceeded' : 'quota_warning',
                'severity'   => $q->is_exceeded ? 'high' : 'medium',
                'material'   => $q->material?->name,
                'task'       => $q->task?->name,
                'planned'    => (float) $q->planned_quantity,
                'actual'     => (float) $q->actual_quantity,
                'usage_pct'  => $q->usage_percentage,
                'message'    => $q->is_exceeded
                    ? "Vật tư [{$q->material?->name}] đã vượt định mức ({$q->usage_percentage}%)"
                    : "Vật tư [{$q->material?->name}] sắp hết định mức ({$q->usage_percentage}%)",
            ];
        }

        // Cảnh báo tồn kho thấp
        $lowStockItems = MaterialInventory::where('project_id', $projectId)
            ->lowStock()
            ->with('material')
            ->get();

        foreach ($lowStockItems as $inv) {
            $warnings[] = [
                'type'       => 'low_stock',
                'severity'   => (float) $inv->current_stock <= 0 ? 'critical' : 'high',
                'material'   => $inv->material?->name,
                'task'       => null,
                'current'    => (float) $inv->current_stock,
                'min_level'  => (float) $inv->min_stock_level,
                'message'    => (float) $inv->current_stock <= 0
                    ? "Vật tư [{$inv->material?->name}] đã hết tồn kho"
                    : "Vật tư [{$inv->material?->name}] tồn kho thấp ({$inv->current_stock} / {$inv->min_stock_level})",
            ];
        }

        // Sort by severity
        usort($warnings, function ($a, $b) {
            $order = ['critical' => 0, 'high' => 1, 'medium' => 2, 'low' => 3];
            return ($order[$a['severity']] ?? 9) <=> ($order[$b['severity']] ?? 9);
        });

        return [
            'warnings'      => $warnings,
            'total_warnings' => count($warnings),
            'critical'       => collect($warnings)->where('severity', 'critical')->count(),
            'high'           => collect($warnings)->where('severity', 'high')->count(),
        ];
    }

    /**
     * Sync tất cả inventory cho project từ transactions
     */
    public function syncAllInventory(int $projectId): void
    {
        $materialIds = MaterialTransaction::where('project_id', $projectId)
            ->distinct()
            ->pluck('material_id');

        foreach ($materialIds as $materialId) {
            $inventory = MaterialInventory::firstOrCreate([
                'project_id'  => $projectId,
                'material_id' => $materialId,
            ]);
            $inventory->syncStock();
        }
    }

    /**
     * Sync tất cả quotas cho project
     */
    public function syncAllQuotas(int $projectId): void
    {
        $quotas = MaterialQuota::where('project_id', $projectId)->get();
        foreach ($quotas as $quota) {
            $quota->syncActualQuantity();
        }
    }

    /**
     * Nhập kho (import material)
     */
    public function importMaterial(int $projectId, array $data): MaterialTransaction
    {
        $transaction = MaterialTransaction::create([
            'material_id'        => $data['material_id'],
            'project_id'         => $projectId,
            'type'               => 'import',
            'quantity'           => $data['quantity'],
            'unit_price'         => $data['unit_price'] ?? 0,
            'total_amount'       => ($data['quantity'] ?? 0) * ($data['unit_price'] ?? 0),
            'supplier_id'        => $data['supplier_id'] ?? null,
            'reference_number'   => $data['reference_number'] ?? null,
            'transaction_date'   => $data['transaction_date'] ?? now(),
            'warehouse_location' => $data['warehouse_location'] ?? null,
            'batch_number'       => $data['batch_number'] ?? null,
            'notes'              => $data['notes'] ?? null,
            'created_by'         => $data['created_by'] ?? auth()->id(),
            'status'             => 'approved',
        ]);

        // Update inventory
        $inventory = MaterialInventory::firstOrCreate([
            'project_id'  => $projectId,
            'material_id' => $data['material_id'],
        ]);
        $inventory->addStock($data['quantity']);

        return $transaction;
    }

    /**
     * Xuất kho (export material)
     */
    public function exportMaterial(int $projectId, array $data): MaterialTransaction
    {
        // Check stock
        $inventory = MaterialInventory::where('project_id', $projectId)
            ->where('material_id', $data['material_id'])
            ->first();

        if ($inventory && (float) $inventory->current_stock < (float) $data['quantity']) {
            throw new \Exception("Tồn kho không đủ. Hiện có: {$inventory->current_stock}");
        }

        $material = Material::findOrFail($data['material_id']);

        $transaction = MaterialTransaction::create([
            'material_id'        => $data['material_id'],
            'project_id'         => $projectId,
            'type'               => 'export',
            'quantity'           => $data['quantity'],
            'unit_price'         => $data['unit_price'] ?? $material->unit_price ?? 0,
            'total_amount'       => ($data['quantity'] ?? 0) * ($data['unit_price'] ?? $material->unit_price ?? 0),
            'reference_number'   => $data['reference_number'] ?? null,
            'transaction_date'   => $data['transaction_date'] ?? now(),
            'warehouse_location' => $data['warehouse_location'] ?? null,
            'batch_number'       => $data['batch_number'] ?? null,
            'notes'              => $data['notes'] ?? null,
            'created_by'         => $data['created_by'] ?? auth()->id(),
            'status'             => 'approved',
        ]);

        // Update inventory
        if ($inventory) {
            $inventory->removeStock($data['quantity']);
        }

        // Update quota actual
        $this->syncAllQuotas($projectId);

        return $transaction;
    }

    /**
     * Lịch sử nhập-xuất
     */
    public function getHistory(int $projectId, ?string $materialId = null): Collection
    {
        return MaterialTransaction::where('project_id', $projectId)
            ->when($materialId, fn($q) => $q->where('material_id', $materialId))
            ->with(['material', 'creator'])
            ->orderByDesc('transaction_date')
            ->limit(200)
            ->get();
    }
}
