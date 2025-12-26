<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PerformanceEvaluation;
use App\Models\PerformanceKPI;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\DB;

class PerformanceController extends Controller
{
    public function getEvaluations(Request $request)
    {
        $user = auth()->user();
        
        $query = PerformanceEvaluation::with(['user', 'project', 'evaluator', 'kpis', 'creator']);

        // Nếu không phải admin/owner, chỉ xem của mình
        if (!$user->owner && $user->role !== 'admin' && !$user->hasPermission('performance.view')) {
            $query->where('user_id', $user->id);
        } elseif ($request->query('user_id')) {
            $query->where('user_id', $request->query('user_id'));
        }

        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }

        if ($evaluationType = $request->query('evaluation_type')) {
            $query->where('evaluation_type', $evaluationType);
        }

        if ($projectId = $request->query('project_id')) {
            $query->where('project_id', $projectId);
        }

        $evaluations = $query->orderBy('evaluation_date', 'desc')->paginate(20);

        return response()->json([
            'success' => true,
            'data' => $evaluations
        ]);
    }

    public function createEvaluation(Request $request)
    {
        $user = auth()->user();
        
        if (!$user->hasPermission('performance.create') && !$user->owner && $user->role !== 'admin') {
            return response()->json([
                'success' => false,
                'message' => 'Không có quyền tạo đánh giá hiệu suất.'
            ], 403);
        }

        $validator = Validator::make($request->all(), [
            'user_id' => 'required|exists:users,id',
            'project_id' => 'nullable|exists:projects,id',
            'evaluation_period' => 'required|string|max:50',
            'evaluation_type' => 'required|in:monthly,quarterly,annual,project_based',
            'evaluation_date' => 'required|date',
            'overall_score' => 'nullable|numeric|min:0|max:100',
            'strengths' => 'nullable|string|max:2000',
            'weaknesses' => 'nullable|string|max:2000',
            'improvements' => 'nullable|string|max:2000',
            'goals' => 'nullable|string|max:2000',
            'comments' => 'nullable|string|max:2000',
            'kpis' => 'nullable|array',
            'kpis.*.kpi_name' => 'required|string|max:255',
            'kpis.*.description' => 'nullable|string|max:2000',
            'kpis.*.target_value' => 'nullable|numeric',
            'kpis.*.actual_value' => 'nullable|numeric',
            'kpis.*.weight' => 'nullable|numeric|min:0|max:100',
            'kpis.*.score' => 'nullable|numeric|min:0|max:100',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Dữ liệu không hợp lệ.',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            DB::beginTransaction();

            $evaluation = PerformanceEvaluation::create([
                'user_id' => $request->user_id,
                'project_id' => $request->project_id,
                'evaluator_id' => $user->id,
                'evaluation_period' => $request->evaluation_period,
                'evaluation_type' => $request->evaluation_type,
                'evaluation_date' => $request->evaluation_date,
                'overall_score' => $request->overall_score,
                'strengths' => $request->strengths,
                'weaknesses' => $request->weaknesses,
                'improvements' => $request->improvements,
                'goals' => $request->goals,
                'comments' => $request->comments,
                'status' => 'draft',
                'created_by' => $user->id,
            ]);

            // Tạo KPIs nếu có
            if ($request->has('kpis') && is_array($request->kpis)) {
                foreach ($request->kpis as $index => $kpi) {
                    PerformanceKPI::create([
                        'evaluation_id' => $evaluation->id,
                        'kpi_name' => $kpi['kpi_name'],
                        'description' => $kpi['description'] ?? null,
                        'target_value' => $kpi['target_value'] ?? null,
                        'actual_value' => $kpi['actual_value'] ?? null,
                        'weight' => $kpi['weight'] ?? 0,
                        'score' => $kpi['score'] ?? null,
                        'notes' => $kpi['notes'] ?? null,
                        'order' => $index,
                    ]);
                }

                // Tính lại overall_score nếu chưa có
                if (!$request->overall_score) {
                    $kpis = PerformanceKPI::where('evaluation_id', $evaluation->id)->get();
                    $totalScore = $kpis->sum(function ($kpi) {
                        return ($kpi->score ?? 0) * ($kpi->weight / 100);
                    });
                    $evaluation->update(['overall_score' => round($totalScore, 2)]);
                }
            }

            DB::commit();

            $evaluation->load(['user', 'project', 'evaluator', 'kpis', 'creator']);

            return response()->json([
                'success' => true,
                'message' => 'Đã tạo đánh giá hiệu suất thành công.',
                'data' => $evaluation
            ], 201);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Có lỗi xảy ra.',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function showEvaluation(string $id)
    {
        $user = auth()->user();
        
        $evaluation = PerformanceEvaluation::with(['user', 'project', 'evaluator', 'kpis', 'creator'])
            ->findOrFail($id);

        // Kiểm tra quyền
        if ($evaluation->user_id !== $user->id && !$user->owner && $user->role !== 'admin' && !$user->hasPermission('performance.view')) {
            return response()->json([
                'success' => false,
                'message' => 'Không có quyền xem đánh giá này.'
            ], 403);
        }

        return response()->json([
            'success' => true,
            'data' => $evaluation
        ]);
    }

    public function updateEvaluation(Request $request, string $id)
    {
        $user = auth()->user();
        
        $evaluation = PerformanceEvaluation::findOrFail($id);

        // Chỉ evaluator hoặc admin mới được update
        if ($evaluation->evaluator_id !== $user->id && !$user->owner && $user->role !== 'admin' && !$user->hasPermission('performance.update')) {
            return response()->json([
                'success' => false,
                'message' => 'Không có quyền cập nhật đánh giá này.'
            ], 403);
        }

        if ($evaluation->status === 'approved') {
            return response()->json([
                'success' => false,
                'message' => 'Không thể cập nhật đánh giá đã được duyệt.'
            ], 422);
        }

        $validator = Validator::make($request->all(), [
            'evaluation_period' => 'sometimes|required|string|max:50',
            'evaluation_date' => 'sometimes|required|date',
            'overall_score' => 'nullable|numeric|min:0|max:100',
            'strengths' => 'nullable|string|max:2000',
            'weaknesses' => 'nullable|string|max:2000',
            'improvements' => 'nullable|string|max:2000',
            'goals' => 'nullable|string|max:2000',
            'comments' => 'nullable|string|max:2000',
            'status' => 'in:draft,submitted,reviewed,approved',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Dữ liệu không hợp lệ.',
                'errors' => $validator->errors()
            ], 422);
        }

        $evaluation->update($request->only([
            'evaluation_period', 'evaluation_date', 'overall_score',
            'strengths', 'weaknesses', 'improvements', 'goals', 'comments', 'status'
        ]));

        $evaluation->load(['user', 'project', 'evaluator', 'kpis', 'creator']);

        return response()->json([
            'success' => true,
            'message' => 'Đã cập nhật đánh giá hiệu suất thành công.',
            'data' => $evaluation
        ]);
    }
}
