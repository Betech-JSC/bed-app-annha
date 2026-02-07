<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Project;
use App\Models\Invoice;
use App\Services\ExpoPushService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\DB;

use App\Constants\Permissions;
use App\Services\AuthorizationService;

class InvoiceController extends Controller
{
    protected $authService;

    public function __construct(AuthorizationService $authService)
    {
        $this->authService = $authService;
    }
    public function index(string $projectId)
    {
        $project = Project::findOrFail($projectId);
        $user = auth()->user();
        
        if (!$this->authService->can($user, Permissions::INVOICE_VIEW, $project)) {
            return response()->json([
                'success' => false,
                'message' => 'Bạn không có quyền xem hóa đơn của dự án này.'
            ], 403);
        }
        $invoices = $project->invoices()
            ->with(['customer', 'creator', 'costGroup', 'attachments'])
            ->orderBy('invoice_date', 'desc')
            ->paginate(20);

        return response()->json([
            'success' => true,
            'data' => $invoices
        ]);
    }

    public function store(Request $request, string $projectId)
    {
        $project = Project::findOrFail($projectId);
        $user = auth()->user();
        
        if (!$this->authService->can($user, Permissions::INVOICE_CREATE, $project)) {
            return response()->json([
                'success' => false,
                'message' => 'Không có quyền tạo hóa đơn cho dự án này.'
            ], 403);
        }

        $validator = Validator::make($request->all(), [
            'invoice_date' => 'required|date',
            'cost_group_id' => 'required|exists:cost_groups,id',
            'subtotal' => 'required|numeric|min:0',
            'tax_amount' => 'nullable|numeric|min:0',
            'discount_amount' => 'nullable|numeric|min:0',
            'description' => 'nullable|string|max:2000',
            'notes' => 'nullable|string|max:2000',
            'attachment_ids' => 'nullable|array',
            'attachment_ids.*' => 'integer|exists:attachments,id',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Dữ liệu không hợp lệ.',
                'errors' => $validator->errors()
            ], 422);
        }

        $totalAmount = $request->subtotal 
            + ($request->tax_amount ?? 0) 
            - ($request->discount_amount ?? 0);

        $invoice = Invoice::create([
            'project_id' => $project->id,
            'cost_group_id' => $request->cost_group_id,
            'invoice_date' => $request->invoice_date,
            'customer_id' => $project->customer_id,
            'subtotal' => $request->subtotal,
            'tax_amount' => $request->tax_amount ?? 0,
            'discount_amount' => $request->discount_amount ?? 0,
            'total_amount' => $totalAmount,
            'description' => $request->description,
            'notes' => $request->notes,
            'created_by' => $user->id,
        ]);

        // Attach files if provided
        if (!empty($request->attachment_ids)) {
            foreach ($request->attachment_ids as $attachmentId) {
                $attachment = \App\Models\Attachment::find($attachmentId);
                if ($attachment && $attachment->uploaded_by === $user->id) {
                    $attachment->update([
                        'attachable_type' => Invoice::class,
                        'attachable_id' => $invoice->id,
                    ]);
                }
            }
        }

        $invoice->load(['customer', 'creator', 'costGroup', 'attachments']);

        return response()->json([
            'success' => true,
            'message' => 'Đã tạo hóa đơn thành công.',
            'data' => $invoice
        ], 201);
    }

    public function show(string $projectId, string $id)
    {
        $project = Project::findOrFail($projectId);
        $user = auth()->user();
        
        if (!$this->authService->can($user, Permissions::INVOICE_VIEW, $project)) {
            return response()->json([
                'success' => false,
                'message' => 'Không có quyền xem hóa đơn của dự án này.'
            ], 403);
        }

        $invoice = Invoice::where('project_id', $projectId)
            ->with(['customer', 'project', 'creator', 'costGroup', 'attachments'])
            ->findOrFail($id);

        return response()->json([
            'success' => true,
            'data' => $invoice
        ]);
    }





    public function update(Request $request, string $projectId, string $id)
    {
        $project = Project::findOrFail($projectId);
        $user = auth()->user();
        
        if (!$this->authService->can($user, Permissions::INVOICE_UPDATE, $project)) {
            return response()->json([
                'success' => false,
                'message' => 'Không có quyền cập nhật hóa đơn của dự án này.'
            ], 403);
        }

        $invoice = Invoice::where('project_id', $projectId)->findOrFail($id);

        $validator = Validator::make($request->all(), [
            'invoice_date' => 'sometimes|required|date',
            'cost_group_id' => 'sometimes|required|exists:cost_groups,id',
            'subtotal' => 'sometimes|required|numeric|min:0',
            'tax_amount' => 'nullable|numeric|min:0',
            'discount_amount' => 'nullable|numeric|min:0',
            'description' => 'nullable|string|max:2000',
            'notes' => 'nullable|string|max:2000',
            'attachment_ids' => 'nullable|array',
            'attachment_ids.*' => 'integer|exists:attachments,id',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Dữ liệu không hợp lệ.',
                'errors' => $validator->errors()
            ], 422);
        }

        $updateData = $request->only([
            'invoice_date', 'cost_group_id', 'subtotal', 'tax_amount', 
            'discount_amount', 'description', 'notes'
        ]);

        // Handle file attachments if provided
        if ($request->has('attachment_ids')) {
            foreach ($request->attachment_ids as $attachmentId) {
                $attachment = \App\Models\Attachment::find($attachmentId);
                if ($attachment && $attachment->uploaded_by === $user->id) {
                    $attachment->update([
                        'attachable_type' => Invoice::class,
                        'attachable_id' => $invoice->id,
                    ]);
                }
            }
        }

        // Tính lại total_amount nếu có thay đổi
        if ($request->has('subtotal') || $request->has('tax_amount') || $request->has('discount_amount')) {
            $subtotal = $updateData['subtotal'] ?? $invoice->subtotal;
            $taxAmount = $updateData['tax_amount'] ?? $invoice->tax_amount;
            $discountAmount = $updateData['discount_amount'] ?? $invoice->discount_amount;
            $updateData['total_amount'] = $subtotal + $taxAmount - $discountAmount;
        }

        $invoice->update($updateData);
        $invoice->load(['customer', 'creator', 'costGroup', 'attachments']);

        return response()->json([
            'success' => true,
            'message' => 'Đã cập nhật hóa đơn thành công.',
            'data' => $invoice
        ]);
    }

    public function destroy(string $projectId, string $id)
    {
        $project = Project::findOrFail($projectId);
        $user = auth()->user();
        
        if (!$this->authService->can($user, Permissions::INVOICE_DELETE, $project)) {
            return response()->json([
                'success' => false,
                'message' => 'Không có quyền xóa hóa đơn của dự án này.'
            ], 403);
        }

        $invoice = Invoice::where('project_id', $projectId)->findOrFail($id);

        $invoice->delete();

        return response()->json([
            'success' => true,
            'message' => 'Đã xóa hóa đơn thành công.'
        ]);
    }

    public function summaryByCostGroup(string $projectId)
    {
        $project = Project::findOrFail($projectId);
        $user = auth()->user();
        
        if (!$this->authService->can($user, Permissions::INVOICE_VIEW, $project)) {
             return response()->json([
                'success' => false,
                'message' => 'Không có quyền xem báo cáo của dự án này.'
            ], 403);
        }

        $summary = Invoice::where('project_id', $projectId)
            ->whereNotNull('cost_group_id')
            ->select('cost_group_id', DB::raw('sum(total_amount) as total_amount'))
            ->groupBy('cost_group_id')
            ->with('costGroup:id,name')
            ->get();
            
        return response()->json([
            'success' => true,
            'data' => $summary
        ]);
    }
}
