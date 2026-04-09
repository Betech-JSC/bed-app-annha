<?php

namespace App\Traits;

use App\Services\CodeGeneratorService;

trait HasAutoCode
{
    /**
     * Get the name of the column that stores the code.
     */
    public function getCodeColumn(): string
    {
        return 'code';
    }

    /**
     * Boot the trait.
     */
    protected static function bootHasAutoCode()
    {
        static::creating(function ($model) {
            $column = $model->getCodeColumn();
            if (empty($model->{$column})) {
                $type = $model->getTable();
                
                // Special mapping for table names to sequence types
                $mapping = [
                    'projects' => 'project',
                    'materials' => 'material',
                    'suppliers' => 'supplier',
                    'material_bills' => 'material_bill',
                    'project_payments' => 'payment',
                    'receipts' => 'receipt',
                    'project_budgets' => 'budget',
                    'construction_logs' => 'construction_log',
                ];

                $sequenceType = $mapping[$type] ?? $type;
                
                $model->{$column} = app(CodeGeneratorService::class)->generate($sequenceType);
            }
        });
    }
}
