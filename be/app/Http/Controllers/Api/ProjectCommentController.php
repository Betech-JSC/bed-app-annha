<?php

namespace App\Http\Controllers\Api;

use App\Constants\Permissions;
use App\Http\Controllers\Controller;
use App\Models\Project;
use App\Models\ProjectComment;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class ProjectCommentController extends Controller
{
    /**
     * Lấy danh sách comments của project
     */
    public function index(Request $request, string $projectId)
    {
        $user = auth()->user();
        $project = Project::findOrFail($projectId);

        // Kiểm tra quyền xem comments
        $canView = false;
        if ($project->customer_id === $user->id) {
            $canView = true; // Customer có thể xem
        } elseif ($project->project_manager_id === $user->id) {
            $canView = true; // Project manager có thể xem
        } elseif ($user->hasPermission(Permissions::PROJECT_COMMENT_VIEW) || 
                  $user->hasPermission(Permissions::PROJECT_VIEW) ||
                  $user->owner || 
                  $user->role === 'admin') {
            $canView = true; // Có quyền xem comment hoặc xem project
        }

        if (!$canView) {
            return response()->json([
                'success' => false,
                'message' => 'Bạn không có quyền xem bình luận của dự án này.'
            ], 403);
        }

        $query = ProjectComment::where('project_id', $projectId)
            ->whereNull('parent_id') // Chỉ lấy comments gốc
            ->with(['user', 'replies.user'])
            ->orderBy('created_at', 'desc');

        $perPage = $request->get('per_page', 20);
        $comments = $query->paginate($perPage);

        return response()->json([
            'success' => true,
            'data' => $comments->items(),
            'pagination' => [
                'current_page' => $comments->currentPage(),
                'last_page' => $comments->lastPage(),
                'per_page' => $comments->perPage(),
                'total' => $comments->total(),
            ],
        ]);
    }

    /**
     * Lấy comment mới nhất của project
     */
    public function getLatest(Request $request, string $projectId)
    {
        $comment = ProjectComment::where('project_id', $projectId)
            ->whereNull('parent_id')
            ->with('user')
            ->orderBy('created_at', 'desc')
            ->first();

        return response()->json([
            'success' => true,
            'data' => $comment,
        ]);
    }

    /**
     * Tạo comment mới
     */
    public function store(Request $request, string $projectId)
    {
        $user = auth()->user();

        $validator = Validator::make($request->all(), [
            'content' => 'required|string|max:5000',
            'parent_id' => 'nullable|exists:project_comments,id',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Dữ liệu không hợp lệ.',
                'errors' => $validator->errors()
            ], 422);
        }

        $project = Project::findOrFail($projectId);

        // Kiểm tra quyền tạo comment
        $canComment = false;
        if ($project->customer_id === $user->id) {
            $canComment = true; // Customer có thể comment
        } elseif ($project->project_manager_id === $user->id) {
            $canComment = true; // Project manager có thể comment
        } elseif ($user->hasPermission(Permissions::PROJECT_COMMENT_CREATE) || 
                  ($user->hasPermission(Permissions::PROJECT_VIEW) && $user->hasPermission(Permissions::PROJECT_COMMENT_CREATE)) ||
                  $user->owner || 
                  $user->role === 'admin') {
            $canComment = true; // Có quyền tạo comment hoặc admin
        }

        if (!$canComment) {
            return response()->json([
                'success' => false,
                'message' => 'Bạn không có quyền bình luận trên dự án này.'
            ], 403);
        }

        $comment = ProjectComment::create([
            'project_id' => $projectId,
            'user_id' => $user->id,
            'content' => $request->content,
            'parent_id' => $request->parent_id,
        ]);

        $comment->load(['user', 'parent']);

        return response()->json([
            'success' => true,
            'message' => 'Đã thêm comment thành công.',
            'data' => $comment
        ], 201);
    }

    /**
     * Cập nhật comment
     */
    public function update(Request $request, string $projectId, string $id)
    {
        $user = auth()->user();
        $comment = ProjectComment::where('project_id', $projectId)
            ->findOrFail($id);

        // Kiểm tra quyền sửa comment
        $canUpdate = false;
        if ($comment->user_id === $user->id) {
            $canUpdate = true; // Người tạo comment có thể sửa
        } elseif ($user->hasPermission(Permissions::PROJECT_COMMENT_UPDATE) && 
                  ($user->owner || $user->role === 'admin')) {
            $canUpdate = true; // Admin hoặc owner có quyền update
        }

        if (!$canUpdate) {
            return response()->json([
                'success' => false,
                'message' => 'Bạn không có quyền sửa bình luận này.'
            ], 403);
        }

        $validator = Validator::make($request->all(), [
            'content' => 'required|string|max:5000',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Dữ liệu không hợp lệ.',
                'errors' => $validator->errors()
            ], 422);
        }

        $comment->update([
            'content' => $request->content,
        ]);

        $comment->load(['user', 'replies.user']);

        return response()->json([
            'success' => true,
            'message' => 'Đã cập nhật comment thành công.',
            'data' => $comment
        ]);
    }

    /**
     * Xóa comment
     */
    public function destroy(string $projectId, string $id)
    {
        $user = auth()->user();
        $comment = ProjectComment::where('project_id', $projectId)
            ->findOrFail($id);

        // Kiểm tra quyền xóa comment
        $canDelete = false;
        if ($comment->user_id === $user->id) {
            $canDelete = true; // Người tạo comment có thể xóa
        } elseif ($user->hasPermission(Permissions::PROJECT_COMMENT_DELETE) && 
                  ($user->owner || $user->role === 'admin')) {
            $canDelete = true; // Admin hoặc owner có quyền delete
        }

        if (!$canDelete) {
            return response()->json([
                'success' => false,
                'message' => 'Bạn không có quyền xóa bình luận này.'
            ], 403);
        }

        $comment->delete();

        return response()->json([
            'success' => true,
            'message' => 'Đã xóa comment thành công.'
        ]);
    }
}
