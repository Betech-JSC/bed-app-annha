<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Attachment;
use App\Models\Project;
use Illuminate\Http\Request;

use App\Constants\Permissions;
use App\Services\AuthorizationService;

class ProjectDocumentController extends Controller
{
    protected $authService;

    public function __construct(AuthorizationService $authService)
    {
        $this->authService = $authService;
    }

    /**
     * Danh sách tài liệu
     */
    public function index(string $projectId, Request $request)
    {
        $project = Project::findOrFail($projectId);

        // Check permission
        $this->authService->require($request->user(), Permissions::PROJECT_DOCUMENT_VIEW, $project);

        $query = $project->attachments();

        // Filter by type
        if ($type = $request->query('type')) {
            $query->where('type', $type);
        }

        $documents = $query->orderByDesc('created_at')->get();

        return response()->json([
            'success' => true,
            'data' => $documents
        ]);
    }

    /**
     * Upload tài liệu
     * Note: File upload should be done via /upload endpoint first,
     * then attach the attachment_id to the project
     */
    public function store(Request $request, string $projectId)
    {
        $project = Project::findOrFail($projectId);

        // Check permission
        $this->authService->require($request->user(), Permissions::PROJECT_DOCUMENT_UPLOAD, $project);

        $validated = $request->validate([
            'attachment_id' => 'required|exists:attachments,id',
            'description' => 'nullable|string|max:1000',
        ]);

        $attachment = Attachment::findOrFail($validated['attachment_id']);

        // Attach to project with description
        $attachment->update([
            'attachable_type' => Project::class,
            'attachable_id' => $project->id,
            'description' => $validated['description'] ?? null,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Tài liệu đã được thêm vào dự án.',
            'data' => $attachment
        ]);
    }

    /**
     * Cập nhật mô tả tài liệu
     */
    public function update(Request $request, string $projectId, string $id)
    {
        $project = Project::findOrFail($projectId);

        // Check permission (using UPLOAD permission for editing description)
        $this->authService->require($request->user(), Permissions::PROJECT_DOCUMENT_UPLOAD, $project);
        
        $attachment = Attachment::where('attachable_type', Project::class)
            ->where('attachable_id', $project->id)
            ->findOrFail($id);

        $validated = $request->validate([
            'description' => 'nullable|string|max:1000',
        ]);

        $attachment->update([
            'description' => $validated['description'] ?? null,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Đã cập nhật mô tả tài liệu.',
            'data' => $attachment
        ]);
    }

    /**
     * Xóa tài liệu khỏi dự án
     * Note: Thực chất là xóa attachment (soft delete nếu model support hoặc hard delete)
     */
    public function destroy(Request $request, string $projectId, string $id)
    {
        $project = Project::findOrFail($projectId);

        // Check permission
        $this->authService->require($request->user(), Permissions::PROJECT_DOCUMENT_DELETE, $project);

        $attachment = Attachment::where('attachable_type', Project::class)
            ->where('attachable_id', $project->id)
            ->findOrFail($id);

        $attachment->delete();

        return response()->json([
            'success' => true,
            'message' => 'Tài liệu đã được xóa khỏi dự án.'
        ]);
    }
}
