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
            // Add polymorphic relationship fields for notifiable (Project, Task, etc.)
            $table->string('notifiable_type')->nullable()->after('user_id');
            $table->unsignedBigInteger('notifiable_id')->nullable()->after('notifiable_type');
            
            // Add index for polymorphic relationship
            $table->index(['notifiable_type', 'notifiable_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('notifications', function (Blueprint $table) {
            // Drop index first
            $table->dropIndex(['notifiable_type', 'notifiable_id']);
            
            // Drop columns
            $table->dropColumn(['notifiable_type', 'notifiable_id']);
        });
    }
};
