<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Normalize stuck `project_manager_approved` records to `supervisor_approved`.
 *
 * Cấp duyệt QLDA (level 2) đã bị bãi bỏ. Bất kỳ stage/item nào đang ở
 * `project_manager_approved` cần được kéo về `supervisor_approved` để
 * customer (level 3) có thể tiếp tục flow GS → KH.
 */
return new class extends Migration {
    public function up(): void
    {
        DB::table('acceptance_stages')
            ->where('status', 'project_manager_approved')
            ->update(['status' => 'supervisor_approved']);

        DB::table('acceptance_items')
            ->where('workflow_status', 'project_manager_approved')
            ->update(['workflow_status' => 'supervisor_approved']);
    }

    public function down(): void
    {
        // Không reverse — không có cách nào phân biệt record nào vốn là
        // supervisor_approved sẵn vs đã chuyển từ project_manager_approved.
    }
};
