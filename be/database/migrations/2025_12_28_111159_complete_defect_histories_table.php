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
        Schema::table('defect_histories', function (Blueprint $table) {
            $table->foreignId('defect_id')->constrained('defects')->cascadeOnDelete();
            $table->enum('action', ['created', 'status_changed', 'assigned', 'updated', 'commented'])->default('status_changed');
            $table->string('old_status')->nullable();
            $table->string('new_status')->nullable();
            $table->text('comment')->nullable();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();

            $table->index('defect_id');
            $table->index('user_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('defect_histories', function (Blueprint $table) {
            $table->dropForeign(['defect_id']);
            $table->dropForeign(['user_id']);
            $table->dropIndex(['defect_id']);
            $table->dropIndex(['user_id']);
            $table->dropColumn([
                'defect_id',
                'action',
                'old_status',
                'new_status',
                'comment',
                'user_id',
            ]);
        });
    }
};
