<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (!Schema::hasTable('subcontractors') || !Schema::hasTable('global_subcontractors')) {
            return;
        }

        // 1. Get all project subcontractors that are not linked to global subcontractors
        $subs = DB::table('subcontractors')
            ->whereNull('global_subcontractor_id')
            ->orWhere('global_subcontractor_id', 0)
            ->get();

        foreach ($subs as $sub) {
            if (empty($sub->name)) {
                continue;
            }
            
            $nameTrimmed = trim($sub->name);
            
            // Search or create a global subcontractor with the same name (case-insensitive)
            $gs = DB::table('global_subcontractors')
                ->whereRaw('LOWER(name) = ?', [strtolower($nameTrimmed)])
                ->first();
                
            if (!$gs) {
                $gsId = DB::table('global_subcontractors')->insertGetId([
                    'name' => $nameTrimmed,
                    'category' => $sub->category,
                    'bank_name' => $sub->bank_name,
                    'bank_account_number' => $sub->bank_account_number,
                    'bank_account_name' => $sub->bank_account_name,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            } else {
                $gsId = $gs->id;
                
                // Update empty fields in global subcontractor with values from project subcontractor
                $updateData = [];
                if (empty($gs->category) && !empty($sub->category)) {
                    $updateData['category'] = $sub->category;
                }
                if (empty($gs->bank_name) && !empty($sub->bank_name)) {
                    $updateData['bank_name'] = $sub->bank_name;
                }
                if (empty($gs->bank_account_number) && !empty($sub->bank_account_number)) {
                    $updateData['bank_account_number'] = $sub->bank_account_number;
                }
                if (empty($gs->bank_account_name) && !empty($sub->bank_account_name)) {
                    $updateData['bank_account_name'] = $sub->bank_account_name;
                }
                
                if (!empty($updateData)) {
                    DB::table('global_subcontractors')
                        ->where('id', $gsId)
                        ->update(array_merge($updateData, ['updated_at' => now()]));
                }
            }
            
            // Update relation in subcontractors
            DB::table('subcontractors')
                ->where('id', $sub->id)
                ->update(['global_subcontractor_id' => $gsId]);
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // No rollback required for data synchronization migration
    }
};
