<?php

namespace App\Exports;

use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;
use Maatwebsite\Excel\Concerns\WithTitle;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use Maatwebsite\Excel\Concerns\WithStyles;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;
use Illuminate\Support\Collection;

class ProjectMaterialSummaryExport implements FromCollection, WithHeadings, WithMapping, WithTitle, ShouldAutoSize, WithStyles
{
    protected $data;
    protected $projectName;

    public function __construct(Collection $data, string $projectName)
    {
        $this->data = $data;
        $this->projectName = $projectName;
    }

    public function collection()
    {
        return $this->data;
    }

    public function headings(): array
    {
        return [
            'Mã vật tư',
            'Tên vật tư',
            'Đơn vị tính',
            'Định mức dự án',
            'Thực dùng',
            'Đơn giá trung bình (đ)',
            'Thành tiền thực tế (đ)',
            'Chênh lệch số lượng',
            'Tỷ lệ sử dụng (%)',
        ];
    }

    public function map($row): array
    {
        return [
            $row['material_code'],
            $row['material_name'],
            $row['unit'],
            (float) $row['planned_quantity'],
            (float) $row['actual_quantity'],
            (float) $row['average_unit_price'],
            (float) $row['total_amount'],
            (float) $row['variance_quantity'],
            $row['planned_quantity'] > 0 ? (float) $row['variance_percentage'] : 'N/A',
        ];
    }

    public function title(): string
    {
        return 'Tổng hợp Vật tư';
    }

    public function styles(Worksheet $sheet)
    {
        // Auto-wrap headings row height
        $sheet->getRowDimension(1)->setRowHeight(28);

        return [
            1 => [
                'font' => [
                    'bold' => true,
                    'color' => ['rgb' => 'FFFFFF'],
                    'size' => 11,
                ],
                'fill' => [
                    'fillType' => \PhpOffice\PhpSpreadsheet\Style\Fill::FILL_SOLID,
                    'startColor' => ['rgb' => '1B4F72'], // Deep Ocean Blue
                ],
                'alignment' => [
                    'horizontal' => \PhpOffice\PhpSpreadsheet\Style\Alignment::HORIZONTAL_CENTER,
                    'vertical' => \PhpOffice\PhpSpreadsheet\Style\Alignment::VERTICAL_CENTER,
                ],
            ],
        ];
    }
}
