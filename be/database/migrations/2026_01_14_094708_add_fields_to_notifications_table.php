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
        Schema::table('notifications', function (Blueprint $table) {
            // Add new fields
            $table->enum('type', [
                'project_performance',
                'system',
                'workflow',
                'assignment',
                'mention',
                'file_upload'
            ])->nullable()->after('user_id');
            
            $table->string('category', 50)->nullable()->after('type');
            
            $table->string('title', 255)->nullable()->after('category');
            
            $table->text('body')->nullable()->after('title');
            
            // Rename message to body if it exists, or keep both
            // We'll keep message for backward compatibility
            
            $table->json('data')->nullable()->after('body');
            
            $table->enum('priority', ['low', 'medium', 'high', 'urgent'])->default('medium')->after('data');
            
            $table->string('action_url', 500)->nullable()->after('priority');
            
            $table->timestamp('read_at')->nullable()->after('status');
            
            $table->timestamp('expires_at')->nullable()->after('read_at');
            
            // Add indexes for performance
            $table->index(['user_id', 'status']);
            $table->index(['user_id', 'type']);
            $table->index(['user_id', 'category']);
            $table->index(['user_id', 'created_at']);
            $table->index('status');
            $table->index('type');
            $table->index('category');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('notifications', function (Blueprint $table) {
            // Drop indexes first
            $table->dropIndex(['user_id', 'status']);
            $table->dropIndex(['user_id', 'type']);
            $table->dropIndex(['user_id', 'category']);
            $table->dropIndex(['user_id', 'created_at']);
            $table->dropIndex(['notifications_status_index']);
            $table->dropIndex(['notifications_type_index']);
            $table->dropIndex(['notifications_category_index']);
            
            // Drop columns
            $table->dropColumn([
                'type',
                'category',
                'title',
                'body',
                'data',
                'priority',
                'action_url',
                'read_at',
                'expires_at'
            ]);
        });
    }
};
