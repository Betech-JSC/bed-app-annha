<?php

namespace App\Services;

use App\Models\Attachment;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Database\Eloquent\Model;

class AttachmentService
{
    /**
     * Handle multi-file upload from CRM/Backend requests.
     *
     * @param Request $request
     * @param Model $entity
     * @param string $storagePath
     * @param bool $validate
     * @param string $fileKey
     * @return int Number of files attached
     */
    public function handleCrmUpload(Request $request, Model $entity, string $storagePath, bool $validate = true, string $fileKey = 'files'): int
    {
        if ($validate || $request->hasFile($fileKey)) {
            $request->validate([
                $fileKey => ($validate ? 'required|' : 'nullable|') . 'array' . ($validate ? '|min:1' : ''),
                "{$fileKey}.*" => 'required|file|max:20480', // max 20MB each
            ]);
        }

        if (!$request->hasFile($fileKey)) {
            return 0;
        }

        // Try admin guard first, then default
        $user = Auth::guard('admin')->user() ?: Auth::user();
        $count = 0;

        foreach ($request->file($fileKey) as $file) {
            $path = $file->store($storagePath, 'public');
            Attachment::create([
                'original_name' => $file->getClientOriginalName(),
                'file_name' => $file->getClientOriginalName(),
                'file_path' => $path,
                'file_url' => '/storage/' . $path,
                'file_size' => $file->getSize(),
                'mime_type' => $file->getClientMimeType(),
                'type' => $request->input('type') ?? $file->getClientOriginalExtension(),
                'description' => $request->input('description') ?? null,
                'attachable_type' => get_class($entity),
                'attachable_id' => $entity->id,
                'uploaded_by' => $user->id ?? null,
            ]);
            $count++;
        }
        return $count;
    }

    /**
     * Link existing attachments (uploaded via separate API) to an entity.
     * This is commonly used in Mobile APIs where files are uploaded first.
     *
     * @param array|null $ids
     * @param Model $entity
     * @param string|null $description Optional tag like 'before', 'after'
     * @return int
     */
    public function linkExistingAttachments(?array $ids, Model $entity, ?string $description = null): int
    {
        if (empty($ids)) {
            return 0;
        }

        return Attachment::whereIn('id', $ids)
            ->update([
                'attachable_type' => get_class($entity),
                'attachable_id' => $entity->id,
                'description' => $description ?? \Illuminate\Support\Facades\DB::raw('description'),
            ]);
    }

    /**
     * Remove all attachments linked to an entity.
     *
     * @param Model $entity
     * @return void
     */
    public function clearAttachments(Model $entity): void
    {
        Attachment::where('attachable_type', get_class($entity))
            ->where('attachable_id', $entity->id)
            ->update([
                'attachable_type' => null,
                'attachable_id' => null
            ]);
    }

    /**
     * Delete specific attachments from storage and database.
     *
     * @param array $ids
     * @param Model|null $entity Optional verify ownership
     * @return int Number of deleted files
     */
    public function deleteAttachments(array $ids, ?Model $entity = null): int
    {
        if (empty($ids)) return 0;

        $query = Attachment::whereIn('id', $ids);
        if ($entity) {
            $query->where('attachable_id', $entity->id)
                  ->where('attachable_type', get_class($entity));
        }

        $attachments = $query->get();
        $count = 0;

        foreach ($attachments as $attachment) {
            if ($attachment->file_path && \Illuminate\Support\Facades\Storage::disk('public')->exists($attachment->file_path)) {
                \Illuminate\Support\Facades\Storage::disk('public')->delete($attachment->file_path);
            }
            $attachment->delete();
            $count++;
        }

        return $count;
    }

    /**
     * Process 'deleted_attachment_ids' from request and perform deletion.
     *
     * @param Request $request
     * @param Model $entity
     * @param string $key
     * @return int
     */
    public function handleDeletedRequest(Request $request, Model $entity, string $key = 'deleted_attachment_ids'): int
    {
        if (!$request->has($key)) return 0;
        
        $ids = $request->input($key);
        if (!is_array($ids)) return 0;

        return $this->deleteAttachments($ids, $entity);
    }
}
