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
        Schema::create('approvals', function (Blueprint $table) {
            $table->id();
            $table->morphs('approvable'); // approvable_type, approvable_id
            $table->foreignId('project_id')->nullable()->constrained('projects')->onDelete('cascade');
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade'); // The requester
            $table->string('status')->default('pending'); // pending, approved, rejected, cancelled
            $table->integer('current_level')->default(1);
            $table->string('summary')->nullable(); // Human-readable summary
            $table->json('metadata')->nullable(); // Contextual data snapshot
            $table->string('last_action')->nullable(); // Action that led to current status
            $table->foreignId('last_actor_id')->nullable()->constrained('users')->onDelete('set null');
            $table->timestamps();

            $table->index('status');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('approvals');
    }
};
