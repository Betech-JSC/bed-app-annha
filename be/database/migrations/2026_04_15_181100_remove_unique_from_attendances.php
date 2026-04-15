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
        Schema::table('attendances', function (Blueprint $table) {
            // First create a regular index for user_id so the foreign key isn't broken
            $table->index('user_id');
            
            // Now we can safely drop the unique constraint
            $table->dropUnique(['user_id', 'work_date']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('attendances', function (Blueprint $table) {
            $table->unique(['user_id', 'work_date']);
            $table->dropIndex(['user_id']);
        });
    }
};
