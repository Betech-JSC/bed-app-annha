<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement("ALTER TABLE equipment_allocations MODIFY COLUMN status ENUM('active','completed','cancelled','returned') DEFAULT 'active'");
    }

    public function down(): void
    {
        DB::statement("ALTER TABLE equipment_allocations MODIFY COLUMN status ENUM('active','completed','cancelled') DEFAULT 'active'");
    }
};
