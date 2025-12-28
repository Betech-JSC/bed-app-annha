<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AcceptanceTemplate;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AcceptanceTemplateController extends Controller
{
    /**
     * Danh sách templates
     */
    public function index(Request $request)
    {
        $query = AcceptanceTemplate::query();

        if ($request->query('active_only')) {
            $query->active();
        }

        $templates = $query->ordered()
            ->with(['attachments'])
            ->get();

        return response()->json([
            'success' => true,
            'data' => $templates
        ]);
    }

    /**
     * Chi tiết template
     */
    public function show(string $id)
    {
        $template = AcceptanceTemplate::with(['attachments'])
            ->findOrFail($id);

        return response()->json([
            'success' => true,
            'data' => $template
        ]);
    }

    /**
     * Tạo template mới
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'standard' => 'nullable|string',
            'is_active' => 'nullable|boolean',
            'order' => 'nullable|integer|min:0',
            'attachment_ids' => 'nullable|array',
            'attachment_ids.*' => 'required|integer|exists:attachments,id',
        ]);

        try {
            DB::beginTransaction();

            $template = AcceptanceTemplate::create([
                'name' => $validated['name'],
                'description' => $validated['description'] ?? null,
                'standard' => $validated['standard'] ?? null,
                'is_active' => $validated['is_active'] ?? true,
                'order' => $validated['order'] ?? 0,
            ]);

            // Attach images if provided
            if (isset($validated['attachment_ids']) && is_array($validated['attachment_ids'])) {
                $order = 0;
                foreach ($validated['attachment_ids'] as $attachmentId) {
                    $attachment = \App\Models\Attachment::find($attachmentId);
                    if ($attachment) {
                        // Create pivot record
                        \App\Models\AcceptanceTemplateImage::create([
                            'acceptance_template_id' => $template->id,
                            'attachment_id' => $attachmentId,
                            'order' => $order++,
                        ]);
                    }
                }
            }

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Bộ tài liệu nghiệm thu đã được tạo thành công.',
                'data' => $template->load(['attachments'])
            ], 201);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Có lỗi xảy ra khi tạo bộ tài liệu nghiệm thu.',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Cập nhật template
     */
    public function update(Request $request, string $id)
    {
        $template = AcceptanceTemplate::findOrFail($id);

        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'description' => 'nullable|string',
            'standard' => 'nullable|string',
            'is_active' => 'nullable|boolean',
            'order' => 'nullable|integer|min:0',
            'attachment_ids' => 'nullable|array',
            'attachment_ids.*' => 'required|integer|exists:attachments,id',
        ]);

        try {
            DB::beginTransaction();

            $template->update([
                'name' => $validated['name'] ?? $template->name,
                'description' => $validated['description'] ?? $template->description,
                'standard' => $validated['standard'] ?? $template->standard,
                'is_active' => $validated['is_active'] ?? $template->is_active,
                'order' => $validated['order'] ?? $template->order,
            ]);

            // Update images if provided
            if (isset($validated['attachment_ids'])) {
                // Delete existing template images
                \App\Models\AcceptanceTemplateImage::where('acceptance_template_id', $template->id)->delete();

                // Create new template images
                $order = 0;
                foreach ($validated['attachment_ids'] as $attachmentId) {
                    $attachment = \App\Models\Attachment::find($attachmentId);
                    if ($attachment) {
                        // Create pivot record
                        \App\Models\AcceptanceTemplateImage::create([
                            'acceptance_template_id' => $template->id,
                            'attachment_id' => $attachmentId,
                            'order' => $order++,
                        ]);
                    }
                }
            }

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Bộ tài liệu nghiệm thu đã được cập nhật thành công.',
                'data' => $template->fresh()->load(['attachments'])
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Có lỗi xảy ra khi cập nhật bộ tài liệu nghiệm thu.',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Xóa template
     */
    public function destroy(string $id)
    {
        $template = AcceptanceTemplate::findOrFail($id);

        try {
            DB::beginTransaction();

            // Delete template images
            \App\Models\AcceptanceTemplateImage::where('acceptance_template_id', $template->id)->delete();

            // Delete template
            $template->delete();

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Bộ tài liệu nghiệm thu đã được xóa thành công.'
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Có lỗi xảy ra khi xóa bộ tài liệu nghiệm thu.',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}
