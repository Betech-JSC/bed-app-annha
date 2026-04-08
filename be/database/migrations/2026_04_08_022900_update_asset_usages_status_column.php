<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // MySQL requires ALTER COLUMN to modify ENUM values
        DB::statement("ALTER TABLE `asset_usages` MODIFY COLUMN `status` VARCHAR(30) NOT NULL DEFAULT 'draft'");

        // Update any existing records with old 'pending_receive' status to 'draft'
        // (Optional: keep them as-is if you want backward compat)
    }

    public function down(): void
    {
        DB::statement("ALTER TABLE `asset_usages` MODIFY COLUMN `status` ENUM('pending_receive','in_use','pending_return','returned') NOT NULL DEFAULT 'pending_receive'");
    }
};
