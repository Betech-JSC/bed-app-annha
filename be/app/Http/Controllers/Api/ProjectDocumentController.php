<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Attachment;
use App\Models\Project;
use Illuminate\Http\Request;

class ProjectDocumentController extends Controller
{
    /**
     * Danh sách tài liệu
     */
    public function index(string $projectId, Request $request)
    {
        $project = Project::findOrFail($projectId);

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

        $validated = $request->validate([
            'attachment_id' => 'required|exists:attachments,id',
            'description' => 'nullable|string|max:1000',
        ]);

        $attachment = Attachment::findOrFail($validated['attachment_id']);

        // Attach to project
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
}
