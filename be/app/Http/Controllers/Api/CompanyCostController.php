<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Cost;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Validator;

use App\Constants\Permissions;
use App\Services\AuthorizationService;

class CompanyCostController extends Controller
{
    protected $authService;

    public function __construct(\App\Services\AuthorizationService $authService)
    {
        $this->authService = $authService;
    }
    /**
     * Display a listing of company costs.
     */
    public function index(Request $request)
    {
        $query = Cost::companyCosts()
            ->with(['creator', 'managementApprover', 'accountantApprover', 'costGroup', 'attachments', 'supplier', 'inputInvoice'])
            ->orderBy('cost_date', 'desc');

        // Filter by status
        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        // Filter by cost_group_id
        if ($request->has('cost_group_id')) {
            $query->where('cost_group_id', $request->cost_group_id);
        }

        // Filter by date range
        if ($request->has('start_date')) {
            $query->whereDate('cost_date', '>=', $request->start_date);
        }
        if ($request->has('end_date')) {
            $query->whereDate('cost_date', '<=', $request->end_date);
        }

        // Search by name or description
        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('description', 'like', "%{$search}%");
            });
        }

        $costs = $query->paginate($request->get('per_page', 15));

        return response()->json([
            'success' => true,
            'data' => $costs,
        ]);
    }

    /**
     * Store a newly created company cost.
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'amount' => 'required|numeric|min:0',
            'cost_group_id' => 'required|exists:cost_groups,id',
            'cost_date' => 'required|date',
            'description' => 'nullable|string',
            'quantity' => 'nullable|numeric|min:0',
            'unit' => 'nullable|string|max:50',
            'supplier_id' => 'nullable|exists:suppliers,id',
            'input_invoice_id' => 'nullable|exists:input_invoices,id',
            'attachment_ids' => 'nullable|array',
            'attachment_ids.*' => 'exists:attachments,id',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        $cost = Cost::create([
            'project_id' => null, // Company cost - no project
            'name' => $request->name,
            'amount' => $request->amount,
            'cost_group_id' => $request->cost_group_id,
            'cost_date' => $request->cost_date,
            'description' => $request->description,
            'quantity' => $request->quantity,
            'unit' => $request->unit,
            'supplier_id' => $request->supplier_id,
            'input_invoice_id' => $request->input_invoice_id,
            'status' => 'draft',
            'created_by' => Auth::id(),
        ]);

        // Attach files if provided
        if ($request->has('attachment_ids')) {
            foreach ($request->attachment_ids as $attachmentId) {
                \DB::table('attachments')
                    ->where('id', $attachmentId)
                    ->update([
                        'attachable_type' => Cost::class,
                        'attachable_id' => $cost->id,
                    ]);
            }
        }

        $cost->load(['creator', 'costGroup', 'attachments', 'supplier', 'inputInvoice']);

        return response()->json([
            'success' => true,
            'message' => 'Đã tạo chi phí công ty thành công',
            'data' => $cost,
        ], 201);
    }

    /**
     * Display the specified company cost.
     */
    public function show($id)
    {
        $cost = Cost::companyCosts()
            ->with(['creator', 'managementApprover', 'accountantApprover', 'costGroup', 'attachments', 'supplier', 'inputInvoice'])
            ->findOrFail($id);

        return response()->json([
            'success' => true,
            'data' => $cost,
        ]);
    }

    /**
     * Update the specified company cost.
     */
    public function update(Request $request, $id)
    {
        $cost = Cost::companyCosts()->findOrFail($id);

        // Only allow editing if status is draft or rejected
        if (!in_array($cost->status, ['draft', 'rejected'])) {
            return response()->json([
                'success' => false,
                'message' => 'Chỉ có thể chỉnh sửa chi phí ở trạng thái nháp hoặc bị từ chối',
            ], 403);
        }

        $validator = Validator::make($request->all(), [
            'name' => 'sometimes|required|string|max:255',
            'amount' => 'sometimes|required|numeric|min:0',
            'cost_group_id' => 'sometimes|required|exists:cost_groups,id',
            'cost_date' => 'sometimes|required|date',
            'description' => 'nullable|string',
            'quantity' => 'nullable|numeric|min:0',
            'unit' => 'nullable|string|max:50',
            'supplier_id' => 'nullable|exists:suppliers,id',
            'input_invoice_id' => 'nullable|exists:input_invoices,id',
            'attachment_ids' => 'nullable|array',
            'attachment_ids.*' => 'exists:attachments,id',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        $cost->update($request->only([
            'name',
            'amount',
            'cost_group_id',
            'cost_date',
            'description',
            'quantity',
            'unit',
            'supplier_id',
            'input_invoice_id',
        ]));

        // Update attachments if provided
        if ($request->has('attachment_ids')) {
            // Detach old attachments
            \DB::table('attachments')
                ->where('attachable_type', Cost::class)
                ->where('attachable_id', $cost->id)
                ->update([
                    'attachable_type' => null,
                    'attachable_id' => null,
                ]);

            // Attach new ones
            foreach ($request->attachment_ids as $attachmentId) {
                \DB::table('attachments')
                    ->where('id', $attachmentId)
                    ->update([
                        'attachable_type' => Cost::class,
                        'attachable_id' => $cost->id,
                    ]);
            }
        }

        $cost->load(['creator', 'costGroup', 'attachments']);

        return response()->json([
            'success' => true,
            'message' => 'Đã cập nhật chi phí công ty thành công',
            'data' => $cost,
        ]);
    }

    /**
     * Remove the specified company cost.
     */
    public function destroy($id)
    {
        $cost = Cost::companyCosts()->findOrFail($id);

        // Only allow deleting if status is draft or rejected
        if (!in_array($cost->status, ['draft', 'rejected'])) {
            return response()->json([
                'success' => false,
                'message' => 'Chỉ có thể xóa chi phí ở trạng thái nháp hoặc bị từ chối',
            ], 403);
        }

        $cost->delete();

        return response()->json([
            'success' => true,
            'message' => 'Đã xóa chi phí công ty thành công',
        ]);
    }

    /**
     * Submit company cost for management approval.
     */
    public function submit($id)
    {
        $cost = Cost::companyCosts()->findOrFail($id);

        if (!$cost->submitForManagementApproval()) {
            return response()->json([
                'success' => false,
                'message' => 'Không thể gửi duyệt chi phí này',
            ], 400);
        }

        return response()->json([
            'success' => true,
            'message' => 'Đã gửi chi phí để ban điều hành duyệt',
            'data' => $cost->fresh(['creator', 'costGroup']),
        ]);
    }

    /**
     * Approve company cost by management.
     */
    public function approveByManagement($id)
    {
        $cost = Cost::companyCosts()->findOrFail($id);
        $user = Auth::user();

        // RBAC check: only users with cost.approve.management can approve
        if (!$this->authService->can($user, Permissions::COST_APPROVE_MANAGEMENT)) {
            return response()->json([
                'success' => false,
                'message' => 'Bạn không có quyền duyệt chi phí (Ban điều hành).',
            ], 403);
        }

        if (!$cost->approveByManagement($user)) {
            return response()->json([
                'success' => false,
                'message' => 'Không thể duyệt chi phí này',
            ], 400);
        }

        return response()->json([
            'success' => true,
            'message' => 'Đã duyệt chi phí (ban điều hành)',
            'data' => $cost->fresh(['creator', 'managementApprover', 'costGroup']),
        ]);
    }

    /**
     * Approve company cost by accountant (final approval).
     */
    public function approveByAccountant($id)
    {
        $cost = Cost::companyCosts()->findOrFail($id);
        $user = Auth::user();

        // RBAC check: only users with cost.approve.accountant can approve
        if (!$this->authService->can($user, Permissions::COST_APPROVE_ACCOUNTANT)) {
            return response()->json([
                'success' => false,
                'message' => 'Bạn không có quyền xác nhận chi phí (Kế toán).',
            ], 403);
        }

        if (!$cost->approveByAccountant($user)) {
            return response()->json([
                'success' => false,
                'message' => 'Không thể xác nhận chi phí này',
            ], 400);
        }

        return response()->json([
            'success' => true,
            'message' => 'Đã xác nhận chi phí (kế toán)',
            'data' => $cost->fresh(['creator', 'managementApprover', 'accountantApprover', 'costGroup']),
        ]);
    }

    /**
     * Reject company cost.
     */
    public function reject(Request $request, $id)
    {
        $validator = Validator::make($request->all(), [
            'reason' => 'required|string|max:500',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        $cost = Cost::companyCosts()->findOrFail($id);
        $user = Auth::user();

        if (!$cost->reject($request->reason, $user)) {
            return response()->json([
                'success' => false,
                'message' => 'Không thể từ chối chi phí này',
            ], 400);
        }

        return response()->json([
            'success' => true,
            'message' => 'Đã từ chối chi phí',
            'data' => $cost->fresh(['creator', 'costGroup']),
        ]);
    }

    /**
     * Get company costs summary/statistics.
     */
    public function summary(Request $request)
    {
        $query = Cost::companyCosts();

        // Filter by date range if provided
        if ($request->has('start_date')) {
            $query->whereDate('cost_date', '>=', $request->start_date);
        }
        if ($request->has('end_date')) {
            $query->whereDate('cost_date', '<=', $request->end_date);
        }

        $summary = [
            'total_costs' => $query->count(),
            'total_amount' => $query->approved()->sum('amount'),
            'draft_count' => (clone $query)->where('status', 'draft')->count(),
            'pending_count' => (clone $query)->pending()->count(),
            'approved_count' => (clone $query)->approved()->count(),
            'rejected_count' => (clone $query)->where('status', 'rejected')->count(),
            'by_cost_group' => (clone $query)->approved()
                ->selectRaw('cost_group_id, SUM(amount) as total')
                ->groupBy('cost_group_id')
                ->with('costGroup:id,name')
                ->get()
                ->map(function ($item) {
                    return [
                        'cost_group_id' => $item->cost_group_id,
                        'cost_group_name' => $item->costGroup->name ?? 'N/A',
                        'total' => $item->total,
                    ];
                }),
            'by_supplier' => (clone $query)->approved()
                ->whereNotNull('supplier_id')
                ->selectRaw('supplier_id, SUM(amount) as total, COUNT(*) as count')
                ->groupBy('supplier_id')
                ->with('supplier:id,name')
                ->get()
                ->map(function ($item) {
                    return [
                        'supplier_id' => $item->supplier_id,
                        'supplier_name' => $item->supplier->name ?? 'N/A',
                        'total' => (float) $item->total,
                        'count' => $item->count,
                    ];
                }),
        ];

        return response()->json([
            'success' => true,
            'data' => $summary,
        ]);
    }
}
