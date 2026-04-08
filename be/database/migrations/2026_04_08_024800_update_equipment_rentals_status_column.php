<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // equipment_rentals: ENUM → VARCHAR to support in_use, pending_return, returned
        DB::statement("ALTER TABLE `equipment_rentals` MODIFY COLUMN `status` VARCHAR(30) NOT NULL DEFAULT 'draft'");
    }

    public function down(): void
    {
        DB::statement("ALTER TABLE `equipment_rentals` MODIFY COLUMN `status` ENUM('draft','pending_management','pending_accountant','completed','rejected') NOT NULL DEFAULT 'draft'");
    }
};
