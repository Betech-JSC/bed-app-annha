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
        Schema::table('payroll', function (Blueprint $table) {
            $table->decimal('social_insurance_amount', 10, 2)->default(0)->after('deductions');
            $table->decimal('health_insurance_amount', 10, 2)->default(0)->after('social_insurance_amount');
            $table->decimal('unemployment_insurance_amount', 10, 2)->default(0)->after('health_insurance_amount');
            $table->decimal('taxable_income', 10, 2)->default(0)->after('unemployment_insurance_amount');
            $table->decimal('personal_deduction', 10, 2)->default(0)->after('taxable_income');
            $table->decimal('dependent_deduction', 10, 2)->default(0)->after('personal_deduction');
            $table->integer('dependents_count')->default(0)->after('dependent_deduction');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('payroll', function (Blueprint $table) {
            $table->dropColumn([
                'social_insurance_amount',
                'health_insurance_amount',
                'unemployment_insurance_amount',
                'taxable_income',
                'personal_deduction',
                'dependent_deduction',
                'dependents_count',
            ]);
        });
    }
};
