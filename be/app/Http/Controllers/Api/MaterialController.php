<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Material;
use App\Models\MaterialTransaction;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class MaterialController extends Controller
{
    public function index(Request $request)
    {
        $user = auth()->user();

        if (!$user->hasPermission('materials.view') && !$user->owner && $user->role !== 'admin') {
            return response()->json([
                'success' => false,
                'message' => 'Không có quyền xem danh sách vật liệu.'
            ], 403);
        }

        $query = Material::query();

        if ($request->query('active_only') === 'true') {
            $query->where('status', 'active');
        }

        if ($search = $request->query('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('code', 'like', "%{$search}%")
                    ->orWhere('category', 'like', "%{$search}%");
            });
        }

        if ($category = $request->query('category')) {
            $query->where('category', $category);
        }

        $materials = $query->paginate(20);

        // Thêm current_stock cho mỗi material
        $materials->getCollection()->transform(function ($material) {
            $material->current_stock = $material->current_stock;
            return $material;
        });

        return response()->json([
            'success' => true,
            'data' => $materials
        ]);
    }

    public function store(Request $request)
    {
        $user = auth()->user();

        if (!$user->hasPermission('materials.create') && !$user->owner && $user->role !== 'admin') {
            return response()->json([
                'success' => false,
                'message' => 'Không có quyền tạo vật liệu.'
            ], 403);
        }

        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'code' => 'nullable|string|max:50|unique:materials,code',
            'unit' => 'required|string|max:20',
            'description' => 'nullable|string',
            'category' => 'nullable|string|max:100',
            'unit_price' => 'required|numeric|min:0',
            'min_stock' => 'nullable|numeric|min:0',
            'max_stock' => 'nullable|numeric|min:0',
            'status' => 'in:active,inactive,discontinued',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Dữ liệu không hợp lệ.',
                'errors' => $validator->errors()
            ], 422);
        }

        $material = Material::create([
            'name' => $request->name,
            'code' => $request->code,
            'unit' => $request->unit,
            'description' => $request->description,
            'category' => $request->category,
            'unit_price' => $request->unit_price,
            'min_stock' => $request->min_stock ?? 0,
            'max_stock' => $request->max_stock,
            'status' => $request->status ?? 'active',
        ]);

        $material->current_stock = 0;

        return response()->json([
            'success' => true,
            'message' => 'Đã tạo vật liệu thành công.',
            'data' => $material
        ], 201);
    }

    public function show(string $id)
    {
        $user = auth()->user();

        if (!$user->hasPermission('materials.view') && !$user->owner && $user->role !== 'admin') {
            return response()->json([
                'success' => false,
                'message' => 'Không có quyền xem vật liệu.'
            ], 403);
        }

        $material = Material::findOrFail($id);
        $material->current_stock = $material->current_stock;

        return response()->json([
            'success' => true,
            'data' => $material
        ]);
    }

    public function getStock(string $id)
    {
        $user = auth()->user();

        if (!$user->hasPermission('materials.view') && !$user->owner && $user->role !== 'admin') {
            return response()->json([
                'success' => false,
                'message' => 'Không có quyền xem tồn kho.'
            ], 403);
        }

        $material = Material::findOrFail($id);
        $currentStock = $material->current_stock;

        return response()->json([
            'success' => true,
            'data' => [
                'material_id' => $material->id,
                'material_name' => $material->name,
                'current_stock' => $currentStock,
                'min_stock' => $material->min_stock,
                'max_stock' => $material->max_stock,
                'unit' => $material->unit,
                'is_low_stock' => $currentStock <= $material->min_stock,
            ]
        ]);
    }

    public function getTransactions(string $id, Request $request)
    {
        $user = auth()->user();

        if (!$user->hasPermission('materials.view') && !$user->owner && $user->role !== 'admin') {
            return response()->json([
                'success' => false,
                'message' => 'Không có quyền xem giao dịch.'
            ], 403);
        }

        $query = MaterialTransaction::where('material_id', $id)
            ->with(['project', 'supplier', 'creator', 'approver']);

        if ($type = $request->query('type')) {
            $query->where('type', $type);
        }

        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }

        $transactions = $query->orderBy('transaction_date', 'desc')->paginate(20);

        return response()->json([
            'success' => true,
            'data' => $transactions
        ]);
    }

    public function update(Request $request, string $id)
    {
        $user = auth()->user();

        if (!$user->hasPermission('materials.update') && !$user->owner && $user->role !== 'admin') {
            return response()->json([
                'success' => false,
                'message' => 'Không có quyền cập nhật vật liệu.'
            ], 403);
        }

        $material = Material::findOrFail($id);

        $validator = Validator::make($request->all(), [
            'name' => 'sometimes|required|string|max:255',
            'code' => 'sometimes|nullable|string|max:50|unique:materials,code,' . $id,
            'unit' => 'sometimes|required|string|max:20',
            'description' => 'nullable|string',
            'category' => 'nullable|string|max:100',
            'unit_price' => 'sometimes|required|numeric|min:0',
            'min_stock' => 'nullable|numeric|min:0',
            'max_stock' => 'nullable|numeric|min:0',
            'status' => 'in:active,inactive,discontinued',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Dữ liệu không hợp lệ.',
                'errors' => $validator->errors()
            ], 422);
        }

        $material->update($request->only([
            'name',
            'code',
            'unit',
            'description',
            'category',
            'unit_price',
            'min_stock',
            'max_stock',
            'status'
        ]));

        $material->current_stock = $material->current_stock;

        return response()->json([
            'success' => true,
            'message' => 'Đã cập nhật vật liệu thành công.',
            'data' => $material
        ]);
    }

    public function destroy(string $id)
    {
        $user = auth()->user();

        if (!$user->hasPermission('materials.delete') && !$user->owner && $user->role !== 'admin') {
            return response()->json([
                'success' => false,
                'message' => 'Không có quyền xóa vật liệu.'
            ], 403);
        }

        $material = Material::findOrFail($id);

        // Kiểm tra có giao dịch không
        if ($material->transactions()->count() > 0) {
            return response()->json([
                'success' => false,
                'message' => 'Không thể xóa vật liệu đã có giao dịch.'
            ], 422);
        }

        $material->delete();

        return response()->json([
            'success' => true,
            'message' => 'Đã xóa vật liệu thành công.'
        ]);
    }
}
