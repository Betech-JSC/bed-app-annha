<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('warranty_retentions', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('project_id')->constrained()->cascadeOnDelete();
            $table->foreignId('subcontractor_id')->nullable()->constrained()->nullOnDelete();
            $table->decimal('retention_amount', 18, 2)->default(0);
            $table->decimal('retention_percentage', 5, 2)->default(5); // Mặc định 5% bảo hành
            $table->date('warranty_start_date')->nullable();
            $table->date('warranty_end_date')->nullable();
            $table->enum('release_status', ['holding', 'partial_release', 'released'])->default('holding');
            $table->decimal('released_amount', 18, 2)->default(0);
            $table->date('released_date')->nullable();
            $table->foreignId('released_by')->nullable()->constrained('users')->nullOnDelete();
            $table->text('notes')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['project_id', 'release_status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('warranty_retentions');
    }
};
