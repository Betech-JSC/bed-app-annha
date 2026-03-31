<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // ENUM → VARCHAR(100) to support all dynamic notification types
        DB::statement("ALTER TABLE notifications MODIFY COLUMN `type` VARCHAR(100) NULL");
    }

    public function down(): void
    {
        DB::statement("ALTER TABLE notifications MODIFY COLUMN `type` ENUM('project_performance','system','workflow','assignment','mention','file_upload') NULL");
    }
};
