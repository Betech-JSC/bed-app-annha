<?php

namespace App\Services;

use App\Models\Sequence;
use Illuminate\Support\Facades\DB;

class CodeGeneratorService
{
    /**
     * Generate a unique code for a given type.
     * 
     * @param string $type The type of sequence (e.g., project, material, supplier)
     * @param string|null $prefix Override default prefix
     * @return string
     */
    public function generate(string $type, ?string $prefix = null): string
    {
        return DB::transaction(function () use ($type, $prefix) {
            $sequence = Sequence::where('type', $type)->lockForUpdate()->first();

            if (!$sequence) {
                // Initialize default sequences if not found
                $sequence = $this->initializeSequence($type);
            }

            $newValue = $sequence->last_value + 1;
            $sequence->last_value = $newValue;
            $sequence->save();

            $finalPrefix = $prefix ?? $sequence->prefix;
            
            // Handle dynamic YEAR/MONTH in prefix if needed (e.g. PVT-202604-)
            $finalPrefix = $this->parsePrefix($finalPrefix);

            return $finalPrefix . str_pad($newValue, $sequence->length, '0', STR_PAD_LEFT) . ($sequence->suffix ?? '');
        });
    }

    /**
     * Parse special placeholders in prefix like {YYYY}, {MM}, {DD}
     */
    protected function parsePrefix(?string $prefix): string
    {
        if (!$prefix) return '';
        
        $replacements = [
            '{YYYY}' => now()->format('Y'),
            '{YY}' => now()->format('y'),
            '{MM}' => now()->format('m'),
            '{DD}' => now()->format('d'),
        ];

        return str_replace(array_keys($replacements), array_values($replacements), $prefix);
    }

    /**
     * Default initialization for common types
     */
    protected function initializeSequence(string $type): Sequence
    {
        $defaults = [
            'project' => ['prefix' => 'DA-{YYYY}-', 'length' => 3],
            'material' => ['prefix' => 'VT-', 'length' => 4],
            'supplier' => ['prefix' => 'NCC-', 'length' => 4],
            'material_bill' => ['prefix' => 'PVT-{YY}{MM}-', 'length' => 3],
            'payment' => ['prefix' => 'PC-{YY}{MM}-', 'length' => 3],
            'receipt' => ['prefix' => 'PT-{YY}{MM}-', 'length' => 3],
            'budget' => ['prefix' => 'NS-{YYYY}-', 'length' => 3],
            'construction_log' => ['prefix' => 'NK-{YY}{MM}{DD}-', 'length' => 2],
        ];

        $config = $defaults[$type] ?? ['prefix' => strtoupper($type) . '-', 'length' => 4];

        return Sequence::create([
            'type' => $type,
            'prefix' => $config['prefix'],
            'last_value' => 0,
            'length' => $config['length'],
        ]);
    }
}
