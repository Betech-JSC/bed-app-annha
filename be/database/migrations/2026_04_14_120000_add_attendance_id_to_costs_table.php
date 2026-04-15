<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('costs', function (Blueprint $table) {
            $table->unsignedBigInteger('attendance_id')->nullable()->after('equipment_allocation_id');
            $table->index('attendance_id');
        });
    }

    public function down(): void
    {
        Schema::table('costs', function (Blueprint $table) {
            $table->dropIndex(['attendance_id']);
            $table->dropColumn('attendance_id');
        });
    }
};
