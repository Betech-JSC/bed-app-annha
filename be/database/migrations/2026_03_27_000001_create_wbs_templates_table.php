<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('wbs_templates', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->string('name');
            $table->string('project_type')->default('residential');
            // residential (dân dụng), industrial (công nghiệp), infrastructure (hạ tầng), interior (nội thất)
            $table->text('description')->nullable();
            $table->boolean('is_active')->default(true);
            $table->unsignedBigInteger('created_by')->nullable();
            $table->timestamps();

            $table->foreign('created_by')->references('id')->on('users')->nullOnDelete();
        });

        Schema::create('wbs_template_items', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->unsignedBigInteger('template_id');
            $table->unsignedBigInteger('parent_id')->nullable();
            $table->string('name');
            $table->text('description')->nullable();
            $table->integer('order')->default(0);
            $table->integer('default_duration')->nullable()->comment('Số ngày mặc định');
            $table->string('unit')->nullable()->comment('Đơn vị: ngày, tuần');
            $table->unsignedBigInteger('cost_group_id')->nullable();
            $table->string('level')->default('task')->comment('phase, category, task, subtask');
            $table->json('default_resources')->nullable()->comment('Nhân lực/vật tư mặc định');
            $table->timestamps();

            $table->foreign('template_id')->references('id')->on('wbs_templates')->cascadeOnDelete();
            $table->foreign('parent_id')->references('id')->on('wbs_template_items')->nullOnDelete();
            $table->foreign('cost_group_id')->references('id')->on('cost_groups')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('wbs_template_items');
        Schema::dropIfExists('wbs_templates');
    }
};
