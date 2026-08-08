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
        Schema::create('activity_logs', function (Blueprint $table) {
            $table->id();
            
            // Performer User details (cached for fast audit & immutable history)
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('user_name')->nullable();
            $table->string('user_email')->nullable();
            $table->string('user_role')->nullable();

            // Log Classification & Action
            $table->string('log_type')->default('audit'); // audit, approval, financial, system
            $table->string('action'); // created, updated, deleted, restored, approved, rejected, force_deleted

            // Target Entity (Subject)
            $table->string('subject_type');
            $table->unsignedBigInteger('subject_id')->nullable();
            $table->string('subject_code')->nullable(); // e.g., CP-0012, HD-0045, VTT-0089

            // Project reference
            $table->foreignId('project_id')->nullable()->constrained('projects')->nullOnDelete();

            // Human readable description
            $table->text('description')->nullable();

            // Diffs
            $table->json('old_values')->nullable();
            $table->json('new_values')->nullable();

            // Request Environment Context
            $table->string('ip_address', 45)->nullable();
            $table->text('user_agent')->nullable();
            $table->text('url')->nullable();

            $table->timestamps();

            // Indexes for fast lookup
            $table->index(['subject_type', 'subject_id']);
            $table->index('project_id');
            $table->index('user_id');
            $table->index('action');
            $table->index('created_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('activity_logs');
    }
};
