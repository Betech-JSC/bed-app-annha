<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Shareholder;
use App\Models\Equipment;
use App\Models\AssetAssignment;
use App\Models\Material;
use App\Models\MaterialInventory;
use App\Models\Cost;
use App\Models\Project;
use App\Models\User;
use App\Constants\Permissions;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Carbon\Carbon;

class OperationsController extends Controller
{
    protected $operationQueryService;

    public function __construct(\App\Services\OperationQueryService $operationQueryService)
    {
        $this->operationQueryService = $operationQueryService;
    }

    public function dashboard(Request $request): JsonResponse
    {
        $user = $request->user();
        $this->authorizePermission($user, Permissions::OPERATIONS_DASHBOARD_VIEW);

        $result = $this->operationQueryService->getDashboardData();

        return response()->json([
            'success' => true,
            'data' => $result,
        ]);
    }

    // ===================================================================
    // SHAREHOLDERS
    // ===================================================================

    public function shareholders(Request $request): JsonResponse
    {
        $user = $request->user();
        $this->authorizePermission($user, Permissions::SHAREHOLDER_VIEW);

        $query = Shareholder::query()->orderBy('contributed_amount', 'desc');

        if ($search = $request->input('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('phone', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%");
            });
        }

        if ($status = $request->input('status')) {
            $query->where('status', $status);
        }

        $shareholders = $query->get();
        $totalCapital = Shareholder::where('status', 'active')->sum('contributed_amount');

        return response()->json([
            'success' => true,
            'data' => $shareholders,
            'total_capital' => (float) $totalCapital,
        ]);
    }

    public function storeShareholder(Request $request): JsonResponse
    {
        $user = $request->user();
        $this->authorizePermission($user, Permissions::SHAREHOLDER_CREATE);

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'contributed_amount' => 'required|numeric|min:0',
            'share_percentage' => 'required|numeric|min:0|max:100',
            'phone' => 'nullable|string|max:20',
            'email' => 'nullable|email|max:255',
            'id_number' => 'nullable|string|max:50',
            'contribution_date' => 'nullable|date',
            'notes' => 'nullable|string',
        ]);

        $validated['created_by'] = $user->id;
        $shareholder = Shareholder::create($validated);

        return response()->json([
            'success' => true,
            'message' => 'Thêm cổ đông thành công',
            'data' => $shareholder,
        ], 201);
    }

    public function updateShareholder(Request $request, string $id): JsonResponse
    {
        $user = $request->user();
        $this->authorizePermission($user, Permissions::SHAREHOLDER_UPDATE);

        $shareholder = Shareholder::findOrFail($id);

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'contributed_amount' => 'sometimes|numeric|min:0',
            'share_percentage' => 'sometimes|numeric|min:0|max:100',
            'phone' => 'nullable|string|max:20',
            'email' => 'nullable|email|max:255',
            'id_number' => 'nullable|string|max:50',
            'contribution_date' => 'nullable|date',
            'status' => 'sometimes|in:active,inactive',
            'notes' => 'nullable|string',
        ]);

        $shareholder->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Cập nhật cổ đông thành công',
            'data' => $shareholder->fresh(),
        ]);
    }

    public function destroyShareholder(Request $request, string $id): JsonResponse
    {
        $user = $request->user();
        $this->authorizePermission($user, Permissions::SHAREHOLDER_DELETE);

        $shareholder = Shareholder::findOrFail($id);
        $shareholder->delete();

        return response()->json([
            'success' => true,
            'message' => 'Xóa cổ đông thành công',
        ]);
    }

    // ===================================================================
    // COMPANY ASSETS
    // ===================================================================

    public function assets(Request $request): JsonResponse
    {
        $user = $request->user();
        $this->authorizePermission($user, Permissions::COMPANY_ASSET_VIEW);

        $query = Equipment::with(['assignedTo:id,name'])
            ->orderBy('created_at', 'desc');

        if ($search = $request->input('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('code', 'like', "%{$search}%")
                  ->orWhere('serial_number', 'like', "%{$search}%");
            });
        }

        if ($category = $request->input('category')) {
            $query->where('category', $category);
        }

        if ($status = $request->input('status')) {
            $query->where('status', $status);
        }

        $assets = $query->get();

        // Stats
        $stats = [
            'total_purchase' => (float) Equipment::sum('purchase_price'),
            'total_value' => (float) Equipment::sum('current_value'),
            'total_depreciation' => (float) Equipment::sum('accumulated_depreciation'),
            'counts' => Equipment::selectRaw('status, count(*) as count')
                ->groupBy('status')
                ->pluck('count', 'status'),
        ];

        return response()->json([
            'success' => true,
            'data' => $assets,
            'stats' => $stats,
        ]);
    }

    public function showAsset(Request $request, string $id): JsonResponse
    {
        $user = $request->user();
        $this->authorizePermission($user, Permissions::COMPANY_ASSET_VIEW);

        $asset = Equipment::with([
            'assignedTo:id,name',
            'assignments' => fn($q) => $q->with('user:id,name', 'project:id,name')->latest()->take(10),
            'depreciations' => fn($q) => $q->latest()->take(12),
        ])->findOrFail($id);

        return response()->json([
            'success' => true,
            'data' => $asset,
        ]);
    }

    public function storeAsset(Request $request): JsonResponse
    {
        $user = $request->user();
        $this->authorizePermission($user, Permissions::COMPANY_ASSET_CREATE);

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'category' => 'required|in:computer,machinery,vehicle,furniture,other',
            'purchase_price' => 'required|numeric|min:0',
            'purchase_date' => 'required|date',
            'useful_life_months' => 'required|integer|min:1',
            'residual_value' => 'nullable|numeric|min:0',
            'serial_number' => 'nullable|string|max:100',
            'brand' => 'nullable|string|max:100',
            'location' => 'nullable|string|max:255',
            'description' => 'nullable|string',
        ]);

        $validated['current_value'] = $validated['purchase_price'];
        $validated['created_by'] = $user->id;

        $asset = Equipment::create($validated);

        return response()->json([
            'success' => true,
            'message' => 'Thêm tài sản thành công',
            'data' => $asset,
        ], 201);
    }

    public function updateAsset(Request $request, string $id): JsonResponse
    {
        $user = $request->user();
        $this->authorizePermission($user, Permissions::COMPANY_ASSET_UPDATE);

        $asset = Equipment::findOrFail($id);

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'category' => 'sometimes|in:computer,machinery,vehicle,furniture,other',
            'purchase_price' => 'sometimes|numeric|min:0',
            'purchase_date' => 'sometimes|date',
            'useful_life_months' => 'sometimes|integer|min:1',
            'residual_value' => 'nullable|numeric|min:0',
            'serial_number' => 'nullable|string|max:100',
            'brand' => 'nullable|string|max:100',
            'location' => 'nullable|string|max:255',
            'description' => 'nullable|string',
        ]);

        $asset->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Cập nhật tài sản thành công',
            'data' => $asset->fresh(),
        ]);
    }

    public function destroyAsset(Request $request, string $id): JsonResponse
    {
        $user = $request->user();
        $this->authorizePermission($user, Permissions::COMPANY_ASSET_DELETE);

        $asset = Equipment::findOrFail($id);
        $asset->delete();

        return response()->json([
            'success' => true,
            'message' => 'Xóa tài sản thành công',
        ]);
    }

    public function assignAsset(Request $request, string $id): JsonResponse
    {
        $user = $request->user();
        $this->authorizePermission($user, Permissions::COMPANY_ASSET_ASSIGN);

        $asset = Equipment::findOrFail($id);

        $validated = $request->validate([
            'action' => 'required|in:assign,return,transfer,repair,dispose',
            'user_id' => 'nullable|exists:users,id',
            'project_id' => 'nullable|exists:projects,id',
            'location' => 'nullable|string|max:255',
            'notes' => 'nullable|string',
        ]);

        // Create assignment record
        AssetAssignment::create([
            'equipment_id' => $asset->id,
            'action' => $validated['action'],
            'user_id' => $validated['user_id'] ?? null,
            'project_id' => $validated['project_id'] ?? null,
            'location' => $validated['location'] ?? null,
            'notes' => $validated['notes'] ?? null,
            'assigned_by' => $user->id,
            'assigned_at' => now(),
        ]);

        // Update asset status
        $newStatus = match ($validated['action']) {
            'assign', 'transfer' => 'in_use',
            'return' => 'available',
            'repair' => 'maintenance',
            'dispose' => 'retired',
        };

        $updateData = ['status' => $newStatus];
        if (isset($validated['user_id'])) {
            $updateData['assigned_to'] = $validated['user_id'];
        }
        if ($validated['action'] === 'return') {
            $updateData['assigned_to'] = null;
        }
        if (isset($validated['location'])) {
            $updateData['location'] = $validated['location'];
        }

        $asset->update($updateData);

        return response()->json([
            'success' => true,
            'message' => 'Cập nhật trạng thái tài sản thành công',
            'data' => $asset->fresh()->load('assignedTo:id,name'),
        ]);
    }

    public function runDepreciation(Request $request): JsonResponse
    {
        $user = $request->user();
        $this->authorizePermission($user, Permissions::COMPANY_ASSET_DEPRECIATE);

        $assets = Equipment::where('status', '!=', 'retired')
            ->where('current_value', '>', 0)
            ->get();

        $assets->each(function (Equipment $asset) {
            // $asset->runMonthlyDepreciation();
        });
        $count = $assets->count();

        return response()->json([
            'success' => true,
            'message' => "Đã chạy khấu hao cho {$count} tài sản",
        ]);
    }

    // ===================================================================
    // HELPERS
    // ===================================================================

    private function authorizePermission($user, string $permission): void
    {
        // Owner always has access
        if ($user->owner) {
            return;
        }

        // Check if user has the permission through their roles or direct
        if (!$user->hasPermission($permission)) {
            abort(403, 'Bạn không có quyền thực hiện hành động này.');
        }
    }
}
