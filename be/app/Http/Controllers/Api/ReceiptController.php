<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Receipt;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class ReceiptController extends Controller
{
    public function index(Request $request)
    {
        $user = auth()->user();
        
        if (!$user->hasPermission('receipts.view') && !$user->owner && $user->role !== 'admin') {
            return response()->json([
                'success' => false,
                'message' => 'Không có quyền xem chứng từ.'
            ], 403);
        }

        $query = Receipt::with(['project', 'supplier', 'cost', 'creator', 'verifier']);

        if ($request->query('project_id')) {
            $query->where('project_id', $request->query('project_id'));
        }

        if ($type = $request->query('type')) {
            $query->where('type', $type);
        }

        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }

        $receipts = $query->orderBy('receipt_date', 'desc')->paginate(20);

        return response()->json([
            'success' => true,
            'data' => $receipts
        ]);
    }

    public function store(Request $request)
    {
        $user = auth()->user();
        
        if (!$user->hasPermission('receipts.create') && !$user->owner && $user->role !== 'admin') {
            return response()->json([
                'success' => false,
                'message' => 'Không có quyền tạo chứng từ.'
            ], 403);
        }

        $validator = Validator::make($request->all(), [
            'project_id' => 'nullable|exists:projects,id',
            'receipt_date' => 'required|date',
            'type' => 'required|in:purchase,expense,payment',
            'supplier_id' => 'nullable|exists:material_suppliers,id',
            'cost_id' => 'nullable|exists:costs,id',
            'amount' => 'required|numeric|min:0',
            'payment_method' => 'nullable|string|max:50',
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

        $receipt = Receipt::create([
            'project_id' => $request->project_id,
            'receipt_date' => $request->receipt_date,
            'type' => $request->type,
            'supplier_id' => $request->supplier_id,
            'cost_id' => $request->cost_id,
            'amount' => $request->amount,
            'payment_method' => $request->payment_method,
            'description' => $request->description,
            'notes' => $request->notes,
            'status' => 'draft',
            'created_by' => $user->id,
        ]);

        $receipt->load(['project', 'supplier', 'cost', 'creator']);

        return response()->json([
            'success' => true,
            'message' => 'Đã tạo chứng từ thành công.',
            'data' => $receipt
        ], 201);
    }

    public function show(string $id)
    {
        $user = auth()->user();
        
        if (!$user->hasPermission('receipts.view') && !$user->owner && $user->role !== 'admin') {
            return response()->json([
                'success' => false,
                'message' => 'Không có quyền xem chứng từ.'
            ], 403);
        }

        $receipt = Receipt::with(['project', 'supplier', 'cost', 'creator', 'verifier'])
            ->findOrFail($id);

        return response()->json([
            'success' => true,
            'data' => $receipt
        ]);
    }

    public function verify(Request $request, string $id)
    {
        $user = auth()->user();
        
        // Chỉ kế toán mới được verify
        if ($user->role !== 'accountant' && !$user->owner && $user->role !== 'admin' && !$user->hasPermission('receipts.verify')) {
            return response()->json([
                'success' => false,
                'message' => 'Chỉ kế toán mới được xác thực chứng từ.'
            ], 403);
        }

        $receipt = Receipt::findOrFail($id);

        if ($receipt->status !== 'draft') {
            return response()->json([
                'success' => false,
                'message' => 'Chứng từ đã được xử lý.'
            ], 422);
        }

        $receipt->update([
            'status' => 'verified',
            'verified_by' => $user->id,
            'verified_at' => now(),
        ]);

        $receipt->load(['project', 'supplier', 'cost', 'creator', 'verifier']);

        return response()->json([
            'success' => true,
            'message' => 'Đã xác thực chứng từ thành công.',
            'data' => $receipt
        ]);
    }

    public function update(Request $request, string $id)
    {
        $user = auth()->user();
        
        if (!$user->hasPermission('receipts.update') && !$user->owner && $user->role !== 'admin') {
            return response()->json([
                'success' => false,
                'message' => 'Không có quyền cập nhật chứng từ.'
            ], 403);
        }

        $receipt = Receipt::findOrFail($id);

        if ($receipt->status === 'verified') {
            return response()->json([
                'success' => false,
                'message' => 'Không thể cập nhật chứng từ đã được xác thực.'
            ], 422);
        }

        $validator = Validator::make($request->all(), [
            'receipt_date' => 'sometimes|required|date',
            'type' => 'sometimes|required|in:purchase,expense,payment',
            'supplier_id' => 'nullable|exists:material_suppliers,id',
            'cost_id' => 'nullable|exists:costs,id',
            'amount' => 'sometimes|required|numeric|min:0',
            'payment_method' => 'nullable|string|max:50',
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

        $receipt->update($request->only([
            'receipt_date', 'type', 'supplier_id', 'cost_id', 'amount',
            'payment_method', 'description', 'notes'
        ]));

        $receipt->load(['project', 'supplier', 'cost', 'creator']);

        return response()->json([
            'success' => true,
            'message' => 'Đã cập nhật chứng từ thành công.',
            'data' => $receipt
        ]);
    }

    public function destroy(string $id)
    {
        $user = auth()->user();
        
        if (!$user->hasPermission('receipts.delete') && !$user->owner && $user->role !== 'admin') {
            return response()->json([
                'success' => false,
                'message' => 'Không có quyền xóa chứng từ.'
            ], 403);
        }

        $receipt = Receipt::findOrFail($id);

        if ($receipt->status === 'verified') {
            return response()->json([
                'success' => false,
                'message' => 'Không thể xóa chứng từ đã được xác thực.'
            ], 422);
        }

        $receipt->delete();

        return response()->json([
            'success' => true,
            'message' => 'Đã xóa chứng từ thành công.'
        ]);
    }
}
