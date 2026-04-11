<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Constants\Permissions;
use App\Models\AcceptanceTemplate;
use App\Models\AcceptanceCriterion;
use App\Models\AcceptanceTemplateImage;
use App\Models\AcceptanceTemplateDocument;
use App\Models\Attachment;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;

class CrmAcceptanceTemplateController extends Controller
{
    use CrmAuthorization;
    /**
     * Danh sách tất cả bộ tài liệu nghiệm thu
     */
    public function index(Request $request)
    {
        $user = Auth::guard('admin')->user();
        $this->crmRequire($user, Permissions::ACCEPTANCE_TEMPLATE_VIEW);
        $templates = AcceptanceTemplate::query()
            ->withCount(['criteria', 'images', 'documents'])
            ->with(['images', 'documents'])
            ->ordered()
            ->get()
            ->map(function ($t) {
                return [
                    'id' => $t->id,
                    'name' => $t->name,
                    'description' => $t->description,
                    'standard' => $t->standard,
                    'is_active' => $t->is_active,
                    'order' => $t->order,
                    'criteria_count' => $t->criteria_count,
                    'images_count' => $t->images_count,
                    'documents_count' => $t->documents_count,
                    'images' => $t->images->map(fn($img) => [
                        'id' => $img->id,
                        'file_name' => $img->file_name,
                        'file_url' => $img->file_url,
                        'mime_type' => $img->mime_type,
                    ]),
                    'documents' => $t->documents->map(fn($doc) => [
                        'id' => $doc->id,
                        'file_name' => $doc->file_name,
                        'file_url' => $doc->file_url,
                        'mime_type' => $doc->mime_type,
                    ]),
                    'created_at' => $t->created_at?->format('d/m/Y H:i'),
                    'updated_at' => $t->updated_at?->format('d/m/Y H:i'),
                ];
            });

        // Stats
        $stats = [
            'total' => AcceptanceTemplate::count(),
            'active' => AcceptanceTemplate::where('is_active', true)->count(),
            'inactive' => AcceptanceTemplate::where('is_active', false)->count(),
            'total_criteria' => AcceptanceCriterion::count(),
        ];

        return Inertia::render('Crm/AcceptanceTemplates/Index', [
            'templates' => $templates,
            'stats' => $stats,
        ]);
    }

    /**
     * Chi tiết 1 bộ tài liệu (trả JSON cho drawer/modal)
     */
    public function show($id)
    {
        $user = Auth::guard('admin')->user();
        $this->crmRequire($user, Permissions::ACCEPTANCE_TEMPLATE_VIEW);
        $template = AcceptanceTemplate::with(['criteria' => fn($q) => $q->orderBy('order'), 'images', 'documents'])
            ->findOrFail($id);

        return response()->json([
            'success' => true,
            'data' => [
                'id' => $template->id,
                'name' => $template->name,
                'description' => $template->description,
                'standard' => $template->standard,
                'is_active' => $template->is_active,
                'order' => $template->order,
                'criteria' => $template->criteria->map(fn($c) => [
                    'id' => $c->id,
                    'name' => $c->name,
                    'description' => $c->description,
                    'is_critical' => $c->is_critical,
                    'order' => $c->order,
                ]),
                'images' => $template->images->map(fn($img) => [
                    'id' => $img->id,
                    'file_name' => $img->file_name,
                    'file_url' => $img->file_url,
                    'mime_type' => $img->mime_type,
                ]),
                'documents' => $template->documents->map(fn($doc) => [
                    'id' => $doc->id,
                    'file_name' => $doc->file_name,
                    'file_url' => $doc->file_url,
                    'mime_type' => $doc->mime_type,
                ]),
                'created_at' => $template->created_at?->format('d/m/Y H:i'),
                'updated_at' => $template->updated_at?->format('d/m/Y H:i'),
            ],
        ]);
    }

    /**
     * Tạo mới bộ tài liệu nghiệm thu
     */
    public function store(Request $request)
    {
        $user = Auth::guard('admin')->user();
        $this->crmRequire($user, Permissions::ACCEPTANCE_TEMPLATE_CREATE);
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string|max:2000',
            'standard' => 'nullable|string|max:500',
            'is_active' => 'nullable|boolean',
            'order' => 'nullable|integer|min:0',
            'criteria' => 'nullable|array',
            'criteria.*.name' => 'required|string|max:255',
            'criteria.*.description' => 'nullable|string',
            'criteria.*.is_critical' => 'nullable|boolean',
            'criteria.*.order' => 'nullable|integer|min:0',
            'files' => 'nullable|array',
            'files.*' => 'file|max:30720', // Tối đa 30MB
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

            // Create criteria
            if (!empty($validated['criteria'])) {
                foreach ($validated['criteria'] as $index => $criterion) {
                    $template->criteria()->create([
                        'name' => $criterion['name'],
                        'description' => $criterion['description'] ?? null,
                        'is_critical' => $criterion['is_critical'] ?? true,
                        'order' => $criterion['order'] ?? $index,
                    ]);
                }
            }

            // Handle file uploads during creation
            if ($request->hasFile('files')) {
                $this->handleFileUploads($template, $request->file('files'));
            }

            DB::commit();
            return back()->with('success', "Đã tạo bộ tài liệu \"{$template->name}\"");
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error creating acceptance template', ['error' => $e->getMessage()]);
            return back()->with('error', 'Có lỗi xảy ra khi tạo bộ tài liệu nghiệm thu.');
        }
    }

    /**
     * Cập nhật bộ tài liệu nghiệm thu
     */
    public function update(Request $request, $id)
    {
        $user = Auth::guard('admin')->user();
        $this->crmRequire($user, Permissions::ACCEPTANCE_TEMPLATE_UPDATE);
        $template = AcceptanceTemplate::findOrFail($id);

        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'description' => 'nullable|string|max:2000',
            'standard' => 'nullable|string|max:500',
            'is_active' => 'nullable|boolean',
            'order' => 'nullable|integer|min:0',
            'criteria' => 'nullable|array',
            'criteria.*.id' => 'nullable|integer',
            'criteria.*.name' => 'required|string|max:255',
            'criteria.*.description' => 'nullable|string',
            'criteria.*.is_critical' => 'nullable|boolean',
            'criteria.*.order' => 'nullable|integer|min:0',
            'existing_image_ids' => 'nullable|array',
            'existing_image_ids.*' => 'integer',
            'existing_document_ids' => 'nullable|array',
            'existing_document_ids.*' => 'integer',
            'files' => 'nullable|array',
            'files.*' => 'file|max:30720',
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

            // Sync criteria
            if ($request->has('criteria')) {
                $keepIds = [];
                foreach ($validated['criteria'] ?? [] as $index => $criterionData) {
                    if (!empty($criterionData['id'])) {
                        // Update existing
                        $criterion = AcceptanceCriterion::where('id', $criterionData['id'])
                            ->where('acceptance_template_id', $template->id)
                            ->first();
                        if ($criterion) {
                            $criterion->update([
                                'name' => $criterionData['name'],
                                'description' => $criterionData['description'] ?? null,
                                'is_critical' => $criterionData['is_critical'] ?? true,
                                'order' => $criterionData['order'] ?? $index,
                            ]);
                            $keepIds[] = $criterion->id;
                        }
                    } else {
                        // Create new
                        $newCriterion = $template->criteria()->create([
                            'name' => $criterionData['name'],
                            'description' => $criterionData['description'] ?? null,
                            'is_critical' => $criterionData['is_critical'] ?? true,
                            'order' => $criterionData['order'] ?? $index,
                        ]);
                        $keepIds[] = $newCriterion->id;
                    }
                }
                // Delete removed criteria
                $template->criteria()->whereNotIn('id', $keepIds)->delete();
            }

            // Handle file deletions/sync
            if ($request->has('existing_image_ids')) {
                AcceptanceTemplateImage::where('acceptance_template_id', $template->id)
                    ->whereNotIn('attachment_id', $request->existing_image_ids)
                    ->delete();
            }
            if ($request->has('existing_document_ids')) {
                AcceptanceTemplateDocument::where('acceptance_template_id', $template->id)
                    ->whereNotIn('attachment_id', $request->existing_document_ids)
                    ->delete();
            }

            // Handle new file uploads
            if ($request->hasFile('files')) {
                $this->handleFileUploads($template, $request->file('files'));
            }

            DB::commit();
            return back()->with('success', "Đã cập nhật bộ tài liệu \"{$template->name}\"");
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error updating acceptance template', ['error' => $e->getMessage()]);
            return back()->with('error', 'Có lỗi xảy ra khi cập nhật bộ tài liệu.');
        }
    }

    /**
     * Toggle active/inactive
     */
    public function toggleActive($id)
    {
        $user = Auth::guard('admin')->user();
        $this->crmRequire($user, Permissions::ACCEPTANCE_TEMPLATE_UPDATE);
        $template = AcceptanceTemplate::findOrFail($id);
        $template->update(['is_active' => !$template->is_active]);

        $status = $template->is_active ? 'kích hoạt' : 'vô hiệu hóa';
        return back()->with('success', "Đã {$status} bộ tài liệu \"{$template->name}\"");
    }

    /**
     * Xóa bộ tài liệu nghiệm thu
     */
    public function destroy($id)
    {
        $user = Auth::guard('admin')->user();
        $this->crmRequire($user, Permissions::ACCEPTANCE_TEMPLATE_DELETE);
        $template = AcceptanceTemplate::findOrFail($id);

        try {
            DB::beginTransaction();

            // Delete related
            AcceptanceTemplateImage::where('acceptance_template_id', $template->id)->delete();
            AcceptanceTemplateDocument::where('acceptance_template_id', $template->id)->delete();
            $template->criteria()->delete();
            $template->delete();

            DB::commit();
            return back()->with('success', "Đã xóa bộ tài liệu \"{$template->name}\"");
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error deleting acceptance template', ['error' => $e->getMessage()]);
            return back()->with('error', 'Không thể xóa bộ tài liệu này. Có thể đang được sử dụng.');
        }
    }

    /**
     * Upload tài liệu cho bộ tài liệu nghiệm thu
     */
    public function uploadDocuments(Request $request, $id)
    {
        $user = Auth::guard('admin')->user();
        $this->crmRequire($user, Permissions::ACCEPTANCE_TEMPLATE_UPDATE);
        $template = AcceptanceTemplate::findOrFail($id);

        $request->validate([
            'files' => 'required|array|min:1',
            'files.*' => 'required|file|max:20480|mimes:pdf,doc,docx,xls,xlsx,jpg,jpeg,png',
        ]);

        try {
            DB::beginTransaction();

            $currentMaxDocOrder = AcceptanceTemplateDocument::where('acceptance_template_id', $template->id)->max('order') ?? 0;
            $currentMaxImgOrder = AcceptanceTemplateImage::where('acceptance_template_id', $template->id)->max('order') ?? 0;

            foreach ($request->file('files') as $index => $file) {
                $mime = $file->getClientMimeType();
                $isImage = str_starts_with($mime, 'image/');
                
                $path = $file->store("acceptance-templates/{$template->id}", 'public');

                $attachment = Attachment::create([
                    'original_name' => $file->getClientOriginalName(),
                    'file_name' => $file->getClientOriginalName(),
                    'file_path' => $path,
                    'file_url' => \Illuminate\Support\Facades\Storage::url($path),
                    'mime_type' => $mime,
                    'file_size' => $file->getSize(),
                    'type' => $isImage ? 'acceptance_template_image' : 'acceptance_template_document',
                    'attachable_type' => AcceptanceTemplate::class,
                    'attachable_id' => $template->id,
                    'uploaded_by' => auth('admin')->id(),
                ]);

                if ($isImage) {
                    AcceptanceTemplateImage::create([
                        'acceptance_template_id' => $template->id,
                        'attachment_id' => $attachment->id,
                        'order' => $currentMaxImgOrder + $index + 1,
                    ]);
                } else {
                    AcceptanceTemplateDocument::create([
                        'acceptance_template_id' => $template->id,
                        'attachment_id' => $attachment->id,
                        'order' => $currentMaxDocOrder + $index + 1,
                    ]);
                }
            }

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Đã upload tài liệu thành công.',
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error uploading acceptance template documents', ['error' => $e->getMessage()]);
            return response()->json([
                'success' => false,
                'message' => 'Có lỗi xảy ra khi upload tài liệu.',
            ], 500);
        }
    }

    /**
     * Private helper to process file uploads and classify them
     */
    private function handleFileUploads($template, $files)
    {
        $currentMaxDocOrder = AcceptanceTemplateDocument::where('acceptance_template_id', $template->id)->max('order') ?? 0;
        $currentMaxImgOrder = AcceptanceTemplateImage::where('acceptance_template_id', $template->id)->max('order') ?? 0;

        foreach ($files as $index => $file) {
            $mime = $file->getClientMimeType();
            $isImage = str_starts_with($mime, 'image/');
            
            $path = $file->store("acceptance-templates/{$template->id}", 'public');

            $attachment = Attachment::create([
                'original_name' => $file->getClientOriginalName(),
                'file_name' => $file->getClientOriginalName(),
                'file_path' => $path,
                'file_url' => \Illuminate\Support\Facades\Storage::url($path),
                'mime_type' => $mime,
                'file_size' => $file->getSize(),
                'type' => $isImage ? 'acceptance_template_image' : 'acceptance_template_document',
                'attachable_type' => AcceptanceTemplate::class,
                'attachable_id' => $template->id,
                'uploaded_by' => auth('admin')->id(),
            ]);

            if ($isImage) {
                AcceptanceTemplateImage::create([
                    'acceptance_template_id' => $template->id,
                    'attachment_id' => $attachment->id,
                    'order' => $currentMaxImgOrder + $index + 1,
                ]);
            } else {
                AcceptanceTemplateDocument::create([
                    'acceptance_template_id' => $template->id,
                    'attachment_id' => $attachment->id,
                    'order' => $currentMaxDocOrder + $index + 1,
                ]);
            }
        }
    }
}
