<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('material_quotas', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('project_id')->constrained()->cascadeOnDelete();
            $table->foreignId('task_id')->nullable()->constrained('project_tasks')->nullOnDelete();
            $table->foreignId('material_id')->constrained()->cascadeOnDelete();
            $table->decimal('planned_quantity', 14, 3);
            $table->string('unit', 30)->nullable();
            $table->decimal('actual_quantity', 14, 3)->default(0); // Calculated from transactions
            $table->decimal('variance_percentage', 8, 2)->default(0); // (actual - planned) / planned * 100
            $table->text('notes')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['project_id', 'material_id']);
            $table->unique(['project_id', 'task_id', 'material_id'], 'mq_project_task_material_unique');
        });

        Schema::create('material_inventory', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_id')->constrained()->cascadeOnDelete();
            $table->foreignId('material_id')->constrained()->cascadeOnDelete();
            $table->decimal('current_stock', 14, 3)->default(0);
            $table->decimal('min_stock_level', 14, 3)->default(0);
            $table->timestamp('last_updated_at')->nullable();
            $table->timestamps();

            $table->unique(['project_id', 'material_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('material_inventory');
        Schema::dropIfExists('material_quotas');
    }
};
