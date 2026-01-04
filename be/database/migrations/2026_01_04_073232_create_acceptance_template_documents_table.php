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
        Schema::create('acceptance_template_documents', function (Blueprint $table) {
            $table->id();
            $table->foreignId('acceptance_template_id')->constrained('acceptance_templates')->cascadeOnDelete();
            $table->foreignId('attachment_id')->constrained('attachments')->cascadeOnDelete();
            $table->integer('order')->default(0);
            $table->timestamps();

            $table->index(['acceptance_template_id', 'order']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('acceptance_template_documents');
    }
};
