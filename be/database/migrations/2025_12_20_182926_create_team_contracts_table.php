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
        Schema::create('team_contracts', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->unsignedBigInteger('team_id'); // Foreign key sẽ được thêm sau
            $table->foreignId('project_id')->constrained('projects')->cascadeOnDelete();
            $table->string('contract_number')->unique()->nullable(); // Số hợp đồng
            $table->string('contract_type')->default('lump_sum'); // lump_sum: khoán, unit_price: đơn giá
            $table->decimal('contract_amount', 15, 2); // Tổng giá trị hợp đồng
            $table->date('start_date')->nullable();
            $table->date('end_date')->nullable();
            $table->text('description')->nullable();
            $table->json('terms')->nullable(); // Điều khoản hợp đồng
            $table->enum('status', ['draft', 'active', 'completed', 'terminated', 'cancelled'])->default('draft');
            $table->foreignId('created_by')->constrained('users')->cascadeOnDelete();
            $table->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('approved_at')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['team_id', 'status']);
            $table->index(['project_id', 'status']);
            $table->index('contract_number');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('team_contracts');
    }
};
