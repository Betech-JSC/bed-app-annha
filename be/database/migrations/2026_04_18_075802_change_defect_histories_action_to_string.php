<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        \DB::statement('SET FOREIGN_KEY_CHECKS=0');
        Schema::table('defect_histories', function (Blueprint $table) {
            $table->string('action', 50)->change();
        });
        \DB::statement('SET FOREIGN_KEY_CHECKS=1');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('defect_histories', function (Blueprint $table) {
            $table->enum('action', ['created', 'status_changed', 'assigned', 'updated', 'commented'])->default('status_changed')->change();
        });
    }
};
