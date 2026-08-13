<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('monthly_tasks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('monthly_plan_id')->constrained('monthly_plans')->onDelete('cascade');
            $table->string('title');
            $table->text('description')->nullable();
            $table->foreignId('assigned_to')->nullable()->constrained('users');
            $table->string('status')->default('todo');
            $table->string('evaluation')->default('none');
            $table->text('evaluation_reason')->nullable();
            $table->date('due_date')->nullable();
            $table->foreignId('created_by')->constrained('users');
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('monthly_tasks');
    }
};
