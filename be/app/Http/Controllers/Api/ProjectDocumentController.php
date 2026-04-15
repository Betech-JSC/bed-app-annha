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
    protected $documentService;

    public function __construct(AuthorizationService $authService, \App\Services\ProjectDocumentService $documentService)
    {
        $this->authService = $authService;
        $this->documentService = $documentService;
    }

    /**
     * Danh sách tài liệu
     */
    public function index(string $projectId, Request $request)
    {
        $project = Project::findOrFail($projectId);

        // Check permission
        $this->authService->require($request->user(), Permissions::PROJECT_DOCUMENT_VIEW, $project);

        $documents = $this->documentService->getProjectDocuments($project, $request->only('type'));

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

        $attachment = $this->documentService->attachToProject($project, $validated['attachment_id'], $validated['description'] ?? null);

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

        $attachment = $this->documentService->updateDescription($attachment, $request->input('description'));

        return response()->json([
            'success' => true,
            'message' => 'Đã cập nhật mô tả tài liệu.',
            'data' => $attachment
        ]);
    }

    /**
     * Xóa tài liệu khỏi dự án
     */
    public function destroy(Request $request, string $projectId, string $id)
    {
        $project = Project::findOrFail($projectId);

        // Check permission
        $this->authService->require($request->user(), Permissions::PROJECT_DOCUMENT_DELETE, $project);

        $attachment = Attachment::where('attachable_type', Project::class)
            ->where('attachable_id', $project->id)
            ->findOrFail($id);

        $this->documentService->removeFromProject($attachment);

        return response()->json([
            'success' => true,
            'message' => 'Tài liệu đã được xóa khỏi dự án.'
        ]);
    }
}
