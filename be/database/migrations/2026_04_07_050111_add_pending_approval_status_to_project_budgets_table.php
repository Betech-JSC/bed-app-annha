<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Sử dụng raw SQL vì Laravel không hỗ trợ thay đổi ENUM mặc định dễ dàng thông qua migration helper
        DB::statement("ALTER TABLE project_budgets MODIFY COLUMN status ENUM('draft', 'pending_approval', 'approved', 'active', 'archived') NOT NULL DEFAULT 'draft'");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::statement("ALTER TABLE project_budgets MODIFY COLUMN status ENUM('draft', 'approved', 'active', 'archived') NOT NULL DEFAULT 'draft'");
    }
};
