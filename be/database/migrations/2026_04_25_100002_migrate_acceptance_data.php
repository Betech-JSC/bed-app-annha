<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Migrate data from acceptance_items → acceptances.
 *
 * Only items with a task_id are migrated (each item = one child task).
 * Orphaned items (no task_id) are skipped.
 *
 * Run this AFTER 2026_04_25_100001_create_acceptances_table.
 * Drop old tables in a separate migration (100003) after staging verification.
 */
return new class extends Migration
{
    public function up(): void
    {
        $items = DB::table('acceptance_items')
            ->whereNotNull('task_id')
            ->whereNull('deleted_at')
            ->get();

        foreach ($items as $item) {
            // Resolve project_id from the parent stage
            $stage = DB::table('acceptance_stages')->where('id', $item->acceptance_stage_id)->first();
            if (!$stage) {
                continue;
            }

            // Skip if already migrated (task_id unique constraint)
            if (DB::table('acceptances')->where('task_id', $item->task_id)->exists()) {
                continue;
            }

            // Map workflow_status: 'project_manager_approved' was normalised to 'supervisor_approved'
            $workflowStatus = $item->workflow_status;
            if ($workflowStatus === 'project_manager_approved') {
                $workflowStatus = 'supervisor_approved';
            }
            // Guard against any unknown status
            $allowed = ['draft', 'submitted', 'supervisor_approved', 'customer_approved', 'rejected'];
            if (!in_array($workflowStatus, $allowed)) {
                $workflowStatus = 'draft';
            }

            DB::table('acceptances')->insert([
                'uuid'                       => (string) Str::uuid(),
                'project_id'                 => $stage->project_id,
                'task_id'                    => $item->task_id,
                'name'                       => $item->name,
                'description'                => $item->description,
                'order'                      => $item->order ?? 0,
                'workflow_status'            => $workflowStatus,
                'notes'                      => $item->notes,
                'submitted_by'               => $item->submitted_by,
                'submitted_at'               => $item->submitted_at,
                'supervisor_approved_by'     => $item->supervisor_approved_by,
                'supervisor_approved_at'     => $item->supervisor_approved_at,
                'customer_approved_by'       => $item->customer_approved_by,
                'customer_approved_at'       => $item->customer_approved_at,
                'rejected_by'                => $item->rejected_by,
                'rejected_at'                => $item->rejected_at,
                'rejection_reason'           => $item->rejection_reason,
                'created_by'                 => $item->created_by,
                'updated_by'                 => $item->updated_by,
                'created_at'                 => $item->created_at,
                'updated_at'                 => $item->updated_at,
            ]);
        }
    }

    public function down(): void
    {
        // Reverse: delete migrated records that came from acceptance_items
        $taskIds = DB::table('acceptance_items')
            ->whereNotNull('task_id')
            ->pluck('task_id');

        DB::table('acceptances')->whereIn('task_id', $taskIds)->delete();
    }
};
