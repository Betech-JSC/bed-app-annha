<?php

use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

require __DIR__ . '/../vendor/autoload.php';
$app = require_once __DIR__ . '/../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

echo "Running individual database indexing changes...\n";

// Table 1: costs
try {
    try {
        Schema::table('costs', function (Blueprint $table) {
            $table->dropIndex('costs_project_status_date_idx');
        });
    } catch (\Exception $e) {}
    try {
        Schema::table('costs', function (Blueprint $table) {
            $table->dropIndex('costs_material_bill_id_idx');
        });
    } catch (\Exception $e) {}
    Schema::table('costs', function (Blueprint $table) {
        $table->index(['project_id', 'status', 'cost_date'], 'costs_project_status_date_idx');
        $table->index('material_bill_id', 'costs_material_bill_id_idx');
    });
    echo "✔ costs table indexed successfully.\n";
} catch (\Exception $e) {
    echo "❌ costs table indexing failed: " . $e->getMessage() . "\n";
}

// Table 2: project_payments
try {
    try {
        Schema::table('project_payments', function (Blueprint $table) {
            $table->dropIndex('project_payments_project_status_date_idx');
        });
    } catch (\Exception $e) {}
    Schema::table('project_payments', function (Blueprint $table) {
        $table->index(['project_id', 'status', 'paid_date'], 'project_payments_project_status_date_idx');
    });
    echo "✔ project_payments table indexed successfully.\n";
} catch (\Exception $e) {
    echo "❌ project_payments table indexing failed: " . $e->getMessage() . "\n";
}

// Table 3: material_bills
try {
    try {
        Schema::table('material_bills', function (Blueprint $table) {
            $table->dropIndex('material_bills_project_status_date_idx');
        });
    } catch (\Exception $e) {}
    Schema::table('material_bills', function (Blueprint $table) {
        $table->index(['project_id', 'status', 'bill_date'], 'material_bills_project_status_date_idx');
    });
    echo "✔ material_bills table indexed successfully.\n";
} catch (\Exception $e) {
    echo "❌ material_bills table indexing failed: " . $e->getMessage() . "\n";
}

// Table 4: subcontractor_payments
try {
    try {
        Schema::table('subcontractor_payments', function (Blueprint $table) {
            $table->dropIndex('subcontractor_payments_subcontractor_id_idx');
        });
    } catch (\Exception $e) {}
    Schema::table('subcontractor_payments', function (Blueprint $table) {
        $table->index('subcontractor_id', 'subcontractor_payments_subcontractor_id_idx');
    });
    echo "✔ subcontractor_payments table indexed successfully.\n";
} catch (\Exception $e) {
    echo "❌ subcontractor_payments table indexing failed: " . $e->getMessage() . "\n";
}

echo "All tasks finished!\n";
