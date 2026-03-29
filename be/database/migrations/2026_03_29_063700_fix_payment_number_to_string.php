<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('project_payments', function (Blueprint $table) {
            $table->string('payment_number', 50)->nullable()->change();
        });

        // Also add 'notes' column if missing
        if (!Schema::hasColumn('project_payments', 'notes')) {
            Schema::table('project_payments', function (Blueprint $table) {
                $table->text('notes')->nullable()->after('amount');
            });
        }

        // Add actual_amount column if missing
        if (!Schema::hasColumn('project_payments', 'actual_amount')) {
            Schema::table('project_payments', function (Blueprint $table) {
                $table->decimal('actual_amount', 15, 2)->nullable()->after('amount');
            });
        }
    }

    public function down(): void
    {
        Schema::table('project_payments', function (Blueprint $table) {
            $table->integer('payment_number')->change();
        });
    }
};
