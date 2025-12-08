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
        Schema::create('regions', function (Blueprint $table) {
            $table->id();
            $table->integer('country_id')->unsigned();
            $table->tinyInteger('level')->comment('1: First; 2: Second; 3: Third; 4: Fourth');
            $table->string('code', 30)->unique();
            $table->string('parent_code', 30)->nullable();
            $table->string('type', 30)->nullable();
            $table->string('name', 100);
            $table->string('name_with_type', 150)->nullable();
            $table->string('path', 255)->nullable();
            $table->text('path_with_type')->nullable();
            $table->tinyInteger('sort')->default(0);
            $table->decimal('shipping_price', 18, 2)->nullable();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('regions');
    }
};
