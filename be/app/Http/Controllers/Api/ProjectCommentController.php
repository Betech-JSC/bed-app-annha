<?php

namespace App\Http\Controllers\Api;

use App\Constants\Permissions;
use App\Http\Controllers\Controller;
use App\Models\Project;
use App\Models\ProjectComment;
use App\Services\AuthorizationService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class ProjectCommentController extends Controller
{
    protected $authService;

    public function __construct(AuthorizationService $authService)
    {
        $this->authService = $authService;
    }
    /**
     * Lấy danh sách comments của project
     */
    public function index(Request $request, string $projectId)
    {
        $user = auth()->user();
        $project = Project::findOrFail($projectId);

        // Check permission với project context
        // Cho phép customer và project manager xem (business logic)
        $canView = false;
        if ($project->customer_id === $user->id || $project->project_manager_id === $user->id) {
            $canView = true;
        } elseif ($this->authService->can($user, Permissions::PROJECT_COMMENT_VIEW, $project)) {
            $canView = true;
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

        // Check permission với project context
        // Cho phép customer và project manager comment (business logic)
        $canComment = false;
        if ($project->customer_id === $user->id || $project->project_manager_id === $user->id) {
            $canComment = true;
        } elseif ($this->authService->can($user, Permissions::PROJECT_COMMENT_CREATE, $project)) {
            $canComment = true;
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

        $project = Project::findOrFail($projectId);

        // Check permission với project context
        // Cho phép người tạo comment sửa (business logic)
        $canUpdate = false;
        if ($comment->user_id === $user->id) {
            $canUpdate = true;
        } elseif ($this->authService->can($user, Permissions::PROJECT_COMMENT_UPDATE, $project)) {
            $canUpdate = true;
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

        $project = Project::findOrFail($projectId);

        // Check permission với project context
        // Cho phép người tạo comment xóa (business logic)
        $canDelete = false;
        if ($comment->user_id === $user->id) {
            $canDelete = true;
        } elseif ($this->authService->can($user, Permissions::PROJECT_COMMENT_DELETE, $project)) {
            $canDelete = true;
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
