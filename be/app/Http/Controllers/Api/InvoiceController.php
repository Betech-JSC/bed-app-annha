<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Project;
use App\Models\Invoice;
use App\Services\ExpoPushService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\DB;

class InvoiceController extends Controller
{
    public function index(string $projectId)
    {
        $user = auth()->user();
        
        if (!$user->hasPermission('invoices.view') && !$user->owner && $user->role !== 'admin') {
            return response()->json([
                'success' => false,
                'message' => 'Không có quyền xem hóa đơn.'
            ], 403);
        }

        $project = Project::findOrFail($projectId);
        $invoices = $project->invoices()
            ->with(['customer', 'creator'])
            ->orderBy('invoice_date', 'desc')
            ->paginate(20);

        return response()->json([
            'success' => true,
            'data' => $invoices
        ]);
    }

    public function store(Request $request, string $projectId)
    {
        $user = auth()->user();
        
        if (!$user->hasPermission('invoices.create') && !$user->owner && $user->role !== 'admin') {
            return response()->json([
                'success' => false,
                'message' => 'Không có quyền tạo hóa đơn.'
            ], 403);
        }

        $project = Project::findOrFail($projectId);

        $validator = Validator::make($request->all(), [
            'invoice_date' => 'required|date',
            'due_date' => 'nullable|date|after_or_equal:invoice_date',
            'subtotal' => 'required|numeric|min:0',
            'tax_amount' => 'nullable|numeric|min:0',
            'discount_amount' => 'nullable|numeric|min:0',
            'description' => 'nullable|string|max:2000',
            'notes' => 'nullable|string|max:2000',
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
            'invoice_date' => $request->invoice_date,
            'due_date' => $request->due_date,
            'customer_id' => $project->customer_id,
            'subtotal' => $request->subtotal,
            'tax_amount' => $request->tax_amount ?? 0,
            'discount_amount' => $request->discount_amount ?? 0,
            'total_amount' => $totalAmount,
            'description' => $request->description,
            'notes' => $request->notes,
            'status' => 'draft',
            'created_by' => $user->id,
        ]);

        $invoice->load(['customer', 'creator']);

        return response()->json([
            'success' => true,
            'message' => 'Đã tạo hóa đơn thành công.',
            'data' => $invoice
        ], 201);
    }

    public function show(string $projectId, string $id)
    {
        $user = auth()->user();
        
        if (!$user->hasPermission('invoices.view') && !$user->owner && $user->role !== 'admin') {
            return response()->json([
                'success' => false,
                'message' => 'Không có quyền xem hóa đơn.'
            ], 403);
        }

        $invoice = Invoice::where('project_id', $projectId)
            ->with(['customer', 'project', 'creator'])
            ->findOrFail($id);

        return response()->json([
            'success' => true,
            'data' => $invoice
        ]);
    }

    public function send(Request $request, string $projectId, string $id)
    {
        $user = auth()->user();
        
        if (!$user->hasPermission('invoices.update') && !$user->owner && $user->role !== 'admin') {
            return response()->json([
                'success' => false,
                'message' => 'Không có quyền gửi hóa đơn.'
            ], 403);
        }

        $invoice = Invoice::where('project_id', $projectId)
            ->with(['customer', 'project'])
            ->findOrFail($id);

        if ($invoice->status !== 'draft') {
            return response()->json([
                'success' => false,
                'message' => 'Chỉ có thể gửi hóa đơn ở trạng thái draft.'
            ], 422);
        }

        $invoice->update(['status' => 'sent']);

        // Gửi thông báo cho khách hàng
        if ($invoice->customer && $invoice->customer->fcm_token) {
            ExpoPushService::sendNotification(
                $invoice->customer->fcm_token,
                "Hóa đơn mới: {$invoice->invoice_number}",
                "Bạn có hóa đơn mới với số tiền: " . number_format($invoice->total_amount, 0, ',', '.') . " VNĐ",
                [
                    'type' => 'invoice',
                    'invoice_id' => $invoice->id,
                    'project_id' => $invoice->project_id,
                ]
            );
        }

        $invoice->load(['customer', 'creator']);

        return response()->json([
            'success' => true,
            'message' => 'Đã gửi hóa đơn thành công.',
            'data' => $invoice
        ]);
    }

    public function markPaid(Request $request, string $projectId, string $id)
    {
        $user = auth()->user();
        
        // Chỉ kế toán mới được đánh dấu đã thanh toán
        if (!$user->hasPermission('invoices.update') && $user->role !== 'accountant' && !$user->owner && $user->role !== 'admin') {
            return response()->json([
                'success' => false,
                'message' => 'Chỉ kế toán mới được đánh dấu hóa đơn đã thanh toán.'
            ], 403);
        }

        $validator = Validator::make($request->all(), [
            'paid_date' => 'required|date',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Vui lòng chọn ngày thanh toán.',
                'errors' => $validator->errors()
            ], 422);
        }

        $invoice = Invoice::where('project_id', $projectId)->findOrFail($id);

        if ($invoice->status === 'paid') {
            return response()->json([
                'success' => false,
                'message' => 'Hóa đơn đã được đánh dấu thanh toán.'
            ], 422);
        }

        $invoice->update([
            'status' => 'paid',
            'paid_date' => $request->paid_date,
        ]);

        $invoice->load(['customer', 'creator']);

        return response()->json([
            'success' => true,
            'message' => 'Đã đánh dấu hóa đơn đã thanh toán.',
            'data' => $invoice
        ]);
    }

    public function update(Request $request, string $projectId, string $id)
    {
        $user = auth()->user();
        
        if (!$user->hasPermission('invoices.update') && !$user->owner && $user->role !== 'admin') {
            return response()->json([
                'success' => false,
                'message' => 'Không có quyền cập nhật hóa đơn.'
            ], 403);
        }

        $invoice = Invoice::where('project_id', $projectId)->findOrFail($id);

        if ($invoice->status === 'paid') {
            return response()->json([
                'success' => false,
                'message' => 'Không thể cập nhật hóa đơn đã thanh toán.'
            ], 422);
        }

        $validator = Validator::make($request->all(), [
            'invoice_date' => 'sometimes|required|date',
            'due_date' => 'nullable|date|after_or_equal:invoice_date',
            'subtotal' => 'sometimes|required|numeric|min:0',
            'tax_amount' => 'nullable|numeric|min:0',
            'discount_amount' => 'nullable|numeric|min:0',
            'description' => 'nullable|string|max:2000',
            'notes' => 'nullable|string|max:2000',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Dữ liệu không hợp lệ.',
                'errors' => $validator->errors()
            ], 422);
        }

        $updateData = $request->only([
            'invoice_date', 'due_date', 'subtotal', 'tax_amount', 
            'discount_amount', 'description', 'notes'
        ]);

        // Tính lại total_amount nếu có thay đổi
        if ($request->has('subtotal') || $request->has('tax_amount') || $request->has('discount_amount')) {
            $subtotal = $updateData['subtotal'] ?? $invoice->subtotal;
            $taxAmount = $updateData['tax_amount'] ?? $invoice->tax_amount;
            $discountAmount = $updateData['discount_amount'] ?? $invoice->discount_amount;
            $updateData['total_amount'] = $subtotal + $taxAmount - $discountAmount;
        }

        $invoice->update($updateData);
        $invoice->load(['customer', 'creator']);

        return response()->json([
            'success' => true,
            'message' => 'Đã cập nhật hóa đơn thành công.',
            'data' => $invoice
        ]);
    }

    public function destroy(string $projectId, string $id)
    {
        $user = auth()->user();
        
        if (!$user->hasPermission('invoices.delete') && !$user->owner && $user->role !== 'admin') {
            return response()->json([
                'success' => false,
                'message' => 'Không có quyền xóa hóa đơn.'
            ], 403);
        }

        $invoice = Invoice::where('project_id', $projectId)->findOrFail($id);

        if ($invoice->status === 'paid') {
            return response()->json([
                'success' => false,
                'message' => 'Không thể xóa hóa đơn đã thanh toán.'
            ], 422);
        }

        $invoice->delete();

        return response()->json([
            'success' => true,
            'message' => 'Đã xóa hóa đơn thành công.'
        ]);
    }
}
