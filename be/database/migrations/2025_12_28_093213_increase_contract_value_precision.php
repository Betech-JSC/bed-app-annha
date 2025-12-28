<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     * 
     * Tăng precision của contract_value từ decimal(15,2) lên decimal(18,2)
     * để hỗ trợ giá trị lớn hơn (tối đa 99,999,999,999,999,999.99)
     */
    public function up(): void
    {
        // Modify contracts table
        DB::statement('ALTER TABLE contracts MODIFY COLUMN contract_value DECIMAL(18, 2) NOT NULL');

        // Modify subcontractor_contracts table
        DB::statement('ALTER TABLE subcontractor_contracts MODIFY COLUMN contract_value DECIMAL(18, 2) NOT NULL');

        // Modify supplier_contracts table
        DB::statement('ALTER TABLE supplier_contracts MODIFY COLUMN contract_value DECIMAL(18, 2) NOT NULL');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Revert back to decimal(15, 2)
        DB::statement('ALTER TABLE contracts MODIFY COLUMN contract_value DECIMAL(15, 2) NOT NULL');
        DB::statement('ALTER TABLE subcontractor_contracts MODIFY COLUMN contract_value DECIMAL(15, 2) NOT NULL');
        DB::statement('ALTER TABLE supplier_contracts MODIFY COLUMN contract_value DECIMAL(15, 2) NOT NULL');
    }
};
