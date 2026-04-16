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
        DB::statement("ALTER TABLE defects MODIFY COLUMN status ENUM('open', 'in_progress', 'fixed', 'verified', 'rejected') NOT NULL DEFAULT 'open'");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::statement("ALTER TABLE defects MODIFY COLUMN status ENUM('open', 'in_progress', 'fixed', 'verified') NOT NULL DEFAULT 'open'");
    }
};
