<?php

namespace App\Exports;

use Maatwebsite\Excel\Concerns\FromArray;
use Maatwebsite\Excel\Concerns\WithTitle;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use Maatwebsite\Excel\Concerns\WithStyles;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

class ProjectPnLSummaryExport implements FromArray, WithTitle, ShouldAutoSize, WithStyles
{
    protected $project;
    protected $pnlData;

    public function __construct($project, array $pnlData)
    {
        $this->project = $project;
        $this->pnlData = $pnlData;
    }

    public function title(): string
    {
        return 'Lãi lỗ dự án';
    }

    public function array(): array
    {
        $revenue = $this->pnlData['revenue'] ?? [];
        $costs = $this->pnlData['costs'] ?? [];
        $pl = $this->pnlData['profit_loss'] ?? [];

        $plannedRevenue = (float) ($revenue['total_revenue'] ?? 0);
        $actualRevenue = (float) ($revenue['total_revenue'] ?? 0); // Contract base
        $paymentsReceived = (float) ($revenue['payments_received'] ?? 0);

        $totalBudget = (float) ($costs['total_budget'] ?? 0);
        $totalCosts = (float) ($costs['total_costs'] ?? 0);
        $costVariance = $totalBudget - $totalCosts; // budget - actual
        $costPercentage = $totalBudget > 0 ? ($totalCosts / $totalBudget) : 0;

        $plannedGrossProfit = (float) ($pl['planned_gross_profit'] ?? 0);
        $grossProfit = (float) ($pl['gross_profit'] ?? 0);
        $profitVariance = $grossProfit - $plannedGrossProfit;
        $profitPercentage = $plannedGrossProfit > 0 ? ($grossProfit / $plannedGrossProfit) : 0;

        $plannedGrossMargin = (float) ($pl['planned_gross_margin'] ?? 0);
        $grossMargin = (float) ($pl['gross_margin'] ?? 0);
        $marginVariance = $grossMargin - $plannedGrossMargin;

        $eacCosts = max($totalBudget, $totalCosts);
        $eacProfit = $plannedRevenue - $eacCosts;
        $eacMargin = $plannedRevenue > 0 ? ($eacProfit / $plannedRevenue * 100) : 0;

        $rows = [
            ['BÁO CÁO DOANH THU, CHI PHÍ & LỢI NHUẬN DỰ ÁN'],
            ['Dự án: ' . $this->project->name . ' (' . $this->project->code . ')'],
            ['Ngày xuất báo cáo: ' . date('d/m/Y H:i')],
            [],
            ['Khoản mục', 'Kế hoạch (Dự toán)', 'Thực tế (Thực chi)', 'Chênh lệch (Dự toán - Thực chi)', 'Tỷ lệ thực tế / kế hoạch'],
            
            // Doanh thu
            ['1. DOANH THU'],
            ['   Doanh thu dự án (Giá trị hợp đồng + Phụ lục)', $plannedRevenue, $actualRevenue, 0, 1.0],
            ['   Doanh thu thực tế đã thu (Khách hàng thanh toán)', null, $paymentsReceived, null, null],
            
            // Chi phí
            ['2. CHI PHÍ DỰ ÁN'],
        ];

        // Cost groups detail
        $byCategory = $costs['by_category'] ?? [];
        $budgetByCategory = $costs['budget_by_category'] ?? [];
        
        $categories = array_unique(array_merge(array_keys($byCategory), array_keys($budgetByCategory)));
        
        $costCatLabels = [
            'material' => 'Vật tư xây dựng',
            'labor' => 'Nhân công',
            'equipment' => 'Máy thi công & Thiết bị',
            'subcontractor' => 'Nhà thầu phụ',
            'management' => 'Chi phí quản lý dự án',
            'other' => 'Chi phí khác',
            'Khác' => 'Chi phí khác',
        ];

        foreach ($categories as $cat) {
            $catLabel = $costCatLabels[$cat] ?? $cat;
            $bAmount = (float) ($budgetByCategory[$cat] ?? 0);
            $cAmount = (float) ($byCategory[$cat] ?? 0);
            $vAmount = $bAmount - $cAmount;
            $pct = $bAmount > 0 ? ($cAmount / $bAmount) : 0;

            $rows[] = [
                '   ' . $catLabel,
                $bAmount,
                $cAmount,
                $vAmount,
                $bAmount > 0 ? $pct : 0
            ];
        }

        // Total Cost Row
        $rows[] = [
            'TỔNG CHI PHÍ DỰ ÁN',
            $totalBudget,
            $totalCosts,
            $costVariance,
            $totalBudget > 0 ? $costPercentage : 0
        ];

        // Lợi nhuận
        $rows[] = ['3. LỢI NHUẬN GỐP & BIÊN LỢI NHUẬN'];
        $rows[] = [
            'LỢI NHUẬN GỐP DỰ ÁN',
            $plannedGrossProfit,
            $grossProfit,
            $profitVariance,
            $plannedGrossProfit > 0 ? $profitPercentage : 0
        ];
        $rows[] = [
            'BIÊN LỢI NHUẬN GỐP (%)',
            $plannedGrossMargin / 100,
            $grossMargin / 100,
            $marginVariance / 100,
            null
        ];

        // EAC
        $rows[] = ['4. DỰ BÁO KHI HOÀN THÀNH (EAC)'];
        $rows[] = [
            '   Tổng chi phí dự báo (EAC) *',
            null,
            $eacCosts,
            null,
            null
        ];
        $rows[] = [
            '   Lợi nhuận dự báo (EAC)',
            null,
            $eacProfit,
            null,
            null
        ];
        $rows[] = [
            '   Biên lợi nhuận dự báo (EAC) (%)',
            null,
            $eacMargin / 100,
            null,
            null
        ];

        return $rows;
    }

    public function styles(Worksheet $sheet)
    {
        // Styling headers and merged cells
        $sheet->mergeCells('A1:E1');
        $sheet->mergeCells('A2:E2');
        $sheet->mergeCells('A3:E3');

        $sheet->getRowDimension(1)->setRowHeight(32);
        $sheet->getRowDimension(2)->setRowHeight(20);
        $sheet->getRowDimension(5)->setRowHeight(26);

        // Center title
        $sheet->getStyle('A1:A3')->getAlignment()->setHorizontal(\PhpOffice\PhpSpreadsheet\Style\Alignment::HORIZONTAL_CENTER);
        $sheet->getStyle('A1:A3')->getAlignment()->setVertical(\PhpOffice\PhpSpreadsheet\Style\Alignment::VERTICAL_CENTER);

        $highestRow = $sheet->getHighestRow();
        
        for ($row = 6; $row <= $highestRow; $row++) {
            $colA = $sheet->getCell('A' . $row)->getValue();
            
            // Section Headers (starts with number like '1. ', '2. ', '3. ', '4. ')
            if (preg_match('/^[1-9]\./', trim($colA))) {
                $sheet->getStyle('A' . $row . ':E' . $row)->getFont()->setBold(true);
                $sheet->getStyle('A' . $row . ':E' . $row)->getFill()->setFillType(\PhpOffice\PhpSpreadsheet\Style\Fill::FILL_SOLID);
                $sheet->getStyle('A' . $row . ':E' . $row)->getFill()->getStartColor()->setRGB('F2F4F4'); // Light grey
                continue;
            }
            
            // Total Rows
            if (in_array(trim($colA), ['TỔNG CHI PHÍ DỰ ÁN', 'LỢI NHUẬN GỐP DỰ ÁN'])) {
                $sheet->getStyle('A' . $row . ':E' . $row)->getFont()->setBold(true);
                if (trim($colA) === 'LỢI NHUẬN GỐP DỰ ÁN') {
                    $sheet->getStyle('A' . $row . ':E' . $row)->getFill()->setFillType(\PhpOffice\PhpSpreadsheet\Style\Fill::FILL_SOLID);
                    $sheet->getStyle('A' . $row . ':E' . $row)->getFill()->getStartColor()->setRGB('D5F5E3'); // Light emerald
                } else {
                    $sheet->getStyle('A' . $row . ':E' . $row)->getFill()->setFillType(\PhpOffice\PhpSpreadsheet\Style\Fill::FILL_SOLID);
                    $sheet->getStyle('A' . $row . ':E' . $row)->getFill()->getStartColor()->setRGB('EBF5FB'); // Light blue
                }
            }

            // Percentage Rows
            if (str_contains($colA, '(%)')) {
                $sheet->getStyle('A' . $row . ':E' . $row)->getFont()->setBold(true);
                $sheet->getStyle('B' . $row . ':D' . $row)->getNumberFormat()->setFormatCode('0.0%');
            } else {
                // Currency format for B, C, D (only if they are numeric)
                $sheet->getStyle('B' . $row . ':D' . $row)->getNumberFormat()->setFormatCode('#,##0"đ"');
            }

            // Column E format as percentage
            $sheet->getStyle('E' . $row)->getNumberFormat()->setFormatCode('0.0%');
        }
        
        return [
            1 => [
                'font' => [
                    'bold' => true,
                    'size' => 16,
                    'color' => ['rgb' => '1B4F72'],
                ],
            ],
            2 => [
                'font' => [
                    'italic' => true,
                    'size' => 11,
                    'color' => ['rgb' => '555555'],
                ],
            ],
            5 => [
                'font' => [
                    'bold' => true,
                    'color' => ['rgb' => 'FFFFFF'],
                ],
                'fill' => [
                    'fillType' => \PhpOffice\PhpSpreadsheet\Style\Fill::FILL_SOLID,
                    'startColor' => ['rgb' => '1B4F72'],
                ],
                'alignment' => [
                    'horizontal' => \PhpOffice\PhpSpreadsheet\Style\Alignment::HORIZONTAL_CENTER,
                    'vertical' => \PhpOffice\PhpSpreadsheet\Style\Alignment::VERTICAL_CENTER,
                ],
            ],
        ];
    }
}
