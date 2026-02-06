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
        // 1. Create acceptance_criteria table
        Schema::create('acceptance_criteria', function (Blueprint $table) {
            $table->id();
            $table->foreignId('acceptance_template_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->text('description')->nullable();
            $table->boolean('is_critical')->default(true);
            $table->integer('order')->default(0);
            $table->timestamps();
        });

        // 2. Modify defects table to add defect_type and acceptance_template_id
        Schema::table('defects', function (Blueprint $table) {
            $table->string('defect_type')->default('other')->after('uuid'); // standard_violation, other
            $table->foreignId('acceptance_template_id')->nullable()->after('task_id')->constrained()->nullOnDelete();
        });

        // 3. Create defect_acceptance_criteria pivot table
        Schema::create('defect_acceptance_criteria', function (Blueprint $table) {
            $table->id();
            $table->foreignId('defect_id')->constrained()->cascadeOnDelete();
            $table->foreignId('acceptance_criterion_id')->constrained('acceptance_criteria')->cascadeOnDelete();
            $table->string('status')->default('failed'); // failed, passed
            $table->timestamp('verified_at')->nullable();
            $table->foreignId('verified_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('defect_acceptance_criteria');
        
        Schema::table('defects', function (Blueprint $table) {
            $table->dropForeign(['acceptance_template_id']);
            $table->dropColumn(['acceptance_template_id', 'defect_type']);
        });

        Schema::dropIfExists('acceptance_criteria');
    }
};
