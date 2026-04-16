<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('project_budgets', function (Blueprint $table) {
            $table->decimal('contract_value', 20, 2)->nullable()->after('total_budget');
            $table->decimal('profit_percentage', 5, 2)->nullable()->after('contract_value')->comment('Lợi nhuận ước tính (%)');
            $table->decimal('profit_amount', 20, 2)->nullable()->after('profit_percentage')->comment('Lợi nhuận ước tính (giá trị)');
        });
    }

    public function down(): void
    {
        Schema::table('project_budgets', function (Blueprint $table) {
            $table->dropColumn(['contract_value', 'profit_percentage', 'profit_amount']);
        });
    }
};
