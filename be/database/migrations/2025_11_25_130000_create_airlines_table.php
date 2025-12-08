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
        Schema::create('airlines', function (Blueprint $table) {
            $table->id();
            $table->string('iata_code', 5)->unique();
            $table->string('icao_code', 5)->nullable();
            $table->string('name_vi');
            $table->string('name_en')->nullable();
            $table->string('call_sign')->nullable();
            $table->string('headquarter_city')->nullable();
            $table->string('country')->default('Vietnam');
            $table->string('website')->nullable();
            $table->string('logo_url')->nullable();
            $table->string('status')->default('active');
            $table->timestamps();

            $table->index('name_vi');
            $table->index('name_en');
            $table->index('country');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('airlines');
    }
};

