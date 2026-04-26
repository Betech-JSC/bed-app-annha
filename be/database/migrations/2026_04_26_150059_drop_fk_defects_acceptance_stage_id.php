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
        Schema::table('defects', function (Blueprint $table) {
            $table->dropForeign(['acceptance_stage_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('defects', function (Blueprint $table) {
            $table->foreign('acceptance_stage_id')->references('id')->on('acceptance_stages')->onDelete('set null');
        });
    }
};
