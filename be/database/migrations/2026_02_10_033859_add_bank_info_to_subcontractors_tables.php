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
        Schema::table('global_subcontractors', function (Blueprint $table) {
            $table->string('bank_name')->nullable()->after('tax_code');
            $table->string('bank_account_number')->nullable()->after('bank_name');
            $table->string('bank_account_name')->nullable()->after('bank_account_number');
        });

        Schema::table('subcontractors', function (Blueprint $table) {
            $table->foreignId('global_subcontractor_id')->nullable()->after('project_id')->constrained('global_subcontractors')->nullOnDelete();
            $table->string('bank_name')->nullable()->after('category');
            $table->string('bank_account_number')->nullable()->after('bank_name');
            $table->string('bank_account_name')->nullable()->after('bank_account_number');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('subcontractors', function (Blueprint $table) {
            $table->dropConstrainedForeignId('global_subcontractor_id');
            $table->dropColumn(['bank_name', 'bank_account_number', 'bank_account_name']);
        });

        Schema::table('global_subcontractors', function (Blueprint $table) {
            $table->dropColumn(['bank_name', 'bank_account_number', 'bank_account_name']);
        });
    }
};
