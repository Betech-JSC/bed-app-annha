<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Make created_by nullable on costs and kpis tables.
 * CRM admin users (admins table) cannot satisfy the FK to users table,
 * so created_by must be nullable when records are created from the CRM.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('costs', function (Blueprint $table) {
            $table->foreignId('created_by')->nullable()->change();
        });

        Schema::table('kpis', function (Blueprint $table) {
            $table->foreignId('created_by')->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('costs', function (Blueprint $table) {
            $table->foreignId('created_by')->nullable(false)->change();
        });

        Schema::table('kpis', function (Blueprint $table) {
            $table->foreignId('created_by')->nullable(false)->change();
        });
    }
};
