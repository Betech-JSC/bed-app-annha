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
        Schema::table('equipment', function (Blueprint $table) {
            if (!Schema::hasColumn('equipment', 'type')) {
                $table->string('type')->nullable()->after('category'); // owned, rented
            }
            $table->integer('useful_life_months')->nullable()->after('purchase_date');
            $table->string('depreciation_method')->default('straight_line')->after('useful_life_months');
            $table->decimal('residual_value', 15, 2)->default(0)->after('depreciation_method');
            $table->decimal('current_value', 15, 2)->nullable()->after('residual_value');
            $table->decimal('accumulated_depreciation', 15, 2)->default(0)->after('current_value');
            $table->foreignId('assigned_to')->nullable()->constrained('users')->nullOnDelete()->after('status');
            $table->string('location')->nullable()->after('assigned_to');
            $table->unsignedBigInteger('created_by')->nullable()->after('location');
        });
    }

    public function down(): void
    {
        Schema::table('equipment', function (Blueprint $table) {
            $table->dropColumn([
                'useful_life_months', 'depreciation_method', 'residual_value', 
                'current_value', 'accumulated_depreciation', 'assigned_to', 
                'location', 'created_by'
            ]);
        });
    }
};
