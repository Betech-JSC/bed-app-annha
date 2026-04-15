<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Supplier;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\DB;

class SupplierController extends Controller
{
    protected $supplierService;

    public function __construct(\App\Services\SupplierService $supplierService)
    {
        $this->supplierService = $supplierService;
    }

    /**
     * Danh sách nhà cung cấp
     */
    public function index(Request $request)
    {
        $user = auth()->user();

        if (!$user->hasPermission('suppliers.view')) {
            return response()->json([
                'success' => false,
                'message' => 'Không có quyền xem danh sách nhà cung cấp.'
            ], 403);
        }

        $suppliers = $this->supplierService->getSuppliers($request->all());

        return response()->json([
            'success' => true,
            'data' => $suppliers
        ]);
    }

    /**
     * Tạo nhà cung cấp mới
     */
    public function store(Request $request)
    {
        $user = auth()->user();

        if (!$user->hasPermission('suppliers.create')) {
            return response()->json([
                'success' => false,
                'message' => 'Không có quyền tạo nhà cung cấp.'
            ], 403);
        }

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'code' => 'nullable|string|max:50|unique:suppliers,code',
            'category' => 'nullable|string|max:255',
            'contact_person' => 'nullable|string|max:255',
            'phone' => 'nullable|string|max:20',
            'email' => 'nullable|email|max:255',
            'address' => 'nullable|string',
            'tax_code' => 'nullable|string|max:50',
            'bank_name' => 'nullable|string|max:255',
            'bank_account' => 'nullable|string|max:50',
            'bank_account_holder' => 'nullable|string|max:255',
            'description' => 'nullable|string',
            'status' => 'in:active,inactive,blacklisted',
        ]);

        try {
            $supplier = $this->supplierService->upsert($validated, null, $user);

            return response()->json([
                'success' => true,
                'message' => 'Đã tạo nhà cung cấp thành công.',
                'data' => $supplier
            ], 201);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage()
            ], 400);
        }
    }

    /**
     * Chi tiết nhà cung cấp
     */
    public function show(string $id)
    {
        $user = auth()->user();

        if (!$user->hasPermission('suppliers.view')) {
            return response()->json([
                'success' => false,
                'message' => 'Không có quyền xem nhà cung cấp.'
            ], 403);
        }

        $supplier = Supplier::with(['contracts', 'acceptances'])->findOrFail($id);

        return response()->json([
            'success' => true,
            'data' => $supplier
        ]);
    }

    /**
     * Cập nhật nhà cung cấp
     */
    public function update(Request $request, string $id)
    {
        $user = auth()->user();

        if (!$user->hasPermission('suppliers.update')) {
            return response()->json([
                'success' => false,
                'message' => 'Không có quyền cập nhật nhà cung cấp.'
            ], 403);
        }

        $supplier = Supplier::findOrFail($id);

        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'code' => 'sometimes|nullable|string|max:50|unique:suppliers,code,' . $id,
            'category' => 'nullable|string|max:255',
            'contact_person' => 'nullable|string|max:255',
            'phone' => 'nullable|string|max:20',
            'email' => 'nullable|email|max:255',
            'address' => 'nullable|string',
            'tax_code' => 'nullable|string|max:50',
            'bank_name' => 'nullable|string|max:255',
            'bank_account' => 'nullable|string|max:50',
            'bank_account_holder' => 'nullable|string|max:255',
            'description' => 'nullable|string',
            'status' => 'in:active,inactive,blacklisted',
        ]);

        try {
            $supplier = $this->supplierService->upsert($validated, $supplier, $user);

            return response()->json([
                'success' => true,
                'message' => 'Đã cập nhật nhà cung cấp thành công.',
                'data' => $supplier
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage()
            ], 400);
        }
    }

    /**
     * Xóa nhà cung cấp
     */
    public function destroy(string $id)
    {
        $user = auth()->user();

        if (!$user->hasPermission('suppliers.delete')) {
            return response()->json([
                'success' => false,
                'message' => 'Không có quyền xóa nhà cung cấp.'
            ], 403);
        }

        $supplier = Supplier::findOrFail($id);

        if ($supplier->contracts()->count() > 0) {
            return response()->json([
                'success' => false,
                'message' => 'Không thể xóa nhà cung cấp có hợp đồng.'
            ], 422);
        }

        $supplier->delete();

        return response()->json([
            'success' => true,
            'message' => 'Đã xóa nhà cung cấp thành công.'
        ]);
    }

    /**
     * Thống kê công nợ và thanh toán
     */
    public function debtStatistics(string $id)
    {
        $user = auth()->user();

        if (!$user->hasPermission('suppliers.view')) {
            return response()->json([
                'success' => false,
                'message' => 'Không có quyền xem thống kê.'
            ], 403);
        }

        $supplier = Supplier::findOrFail($id);

        // Logic moves to service ideally, but for now we keep the calculation here if it's strictly presentation
        // Calculating metrics based on relationships
        $totalContractValue = $supplier->contracts()
            ->where('status', 'active')
            ->sum('contract_value');

        $totalAccepted = $supplier->acceptances()
            ->where('status', 'approved')
            ->sum('accepted_amount');

        $totalPaid = (float)$supplier->total_paid;
        $totalDebt = max(0, (float)$totalAccepted - $totalPaid);
        $remainingContractCommitment = max(0, (float)$totalContractValue - $totalPaid);

        return response()->json([
            'success' => true,
            'data' => [
                'supplier' => [
                    'id' => $supplier->id,
                    'name' => $supplier->name,
                ],
                'statistics' => [
                    'total_contract_value' => (float) $totalContractValue,
                    'total_accepted' => (float) $totalAccepted,
                    'total_paid' => (float) $totalPaid,
                    'total_debt' => (float) $totalDebt,
                    'remaining_debt' => (float) $remainingContractCommitment,
                    'payment_percentage' => $totalAccepted > 0 
                        ? round(($totalPaid / $totalAccepted) * 100, 2) 
                        : 0,
                ],
            ],
        ]);
    }
}
