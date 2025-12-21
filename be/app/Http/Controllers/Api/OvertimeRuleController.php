<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\OvertimeRule;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class OvertimeRuleController extends Controller
{
    /**
     * Danh sách quy định OT
     */
    public function index(Request $request)
    {
        $query = OvertimeRule::query();

        if ($request->has('type')) {
            $query->where('type', $request->type);
        }

        if ($request->has('is_active')) {
            $query->where('is_active', $request->is_active);
        }

        $rules = $query->orderBy('type')->orderBy('multiplier')->get();

        return response()->json([
            'success' => true,
            'data' => $rules
        ]);
    }

    /**
     * Tạo quy định OT mới
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'type' => 'required|in:weekday,weekend,holiday',
            'start_time' => 'nullable|date_format:H:i',
            'end_time' => 'nullable|date_format:H:i',
            'multiplier' => 'required|numeric|min:1|max:10',
            'description' => 'nullable|string',
            'is_active' => 'nullable|boolean',
            'effective_from' => 'nullable|date',
            'effective_to' => 'nullable|date|after:effective_from',
        ]);

        $rule = OvertimeRule::create($validated);

        return response()->json([
            'success' => true,
            'message' => 'Đã tạo quy định OT thành công',
            'data' => $rule
        ], 201);
    }

    /**
     * Cập nhật quy định OT
     */
    public function update(Request $request, $id)
    {
        $rule = OvertimeRule::findOrFail($id);

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'type' => 'sometimes|in:weekday,weekend,holiday',
            'start_time' => 'nullable|date_format:H:i',
            'end_time' => 'nullable|date_format:H:i',
            'multiplier' => 'sometimes|numeric|min:1|max:10',
            'description' => 'nullable|string',
            'is_active' => 'nullable|boolean',
            'effective_from' => 'nullable|date',
            'effective_to' => 'nullable|date|after:effective_from',
        ]);

        $rule->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Đã cập nhật quy định OT thành công',
            'data' => $rule
        ]);
    }

    /**
     * Xóa quy định OT
     */
    public function destroy($id)
    {
        $rule = OvertimeRule::findOrFail($id);
        $rule->delete();

        return response()->json([
            'success' => true,
            'message' => 'Đã xóa quy định OT thành công'
        ]);
    }
}
