<?php

namespace App\Exports;

use Maatwebsite\Excel\Concerns\FromArray;
use Maatwebsite\Excel\Concerns\WithTitle;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use Maatwebsite\Excel\Concerns\WithStyles;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

class ProjectCashFlowSummaryExport implements FromArray, WithTitle, ShouldAutoSize, WithStyles
{
    protected $project;
    protected $cashFlowData;
    protected $actualPayments;
    protected $actualCosts;

    public function __construct($project, array $cashFlowData, $actualPayments = [], $actualCosts = [])
    {
        $this->project = $project;
        $this->cashFlowData = $cashFlowData;
        $this->actualPayments = $actualPayments;
        $this->actualCosts = $actualCosts;
    }

    public function title(): string
    {
        return 'Dòng tiền dự án';
    }

    public function array(): array
    {
        $months = $this->cashFlowData['months'] ?? [];
        $totals = $this->cashFlowData['totals'] ?? [];

        $totalInflow = (float) ($totals['total_inflow'] ?? 0);
        $totalOutflow = (float) ($totals['total_outflow'] ?? 0);
        $netCashFlow = (float) ($totals['net_cash_flow'] ?? 0);

        $rows = [
            ['BÁO CÁO KẾ HOẠCH & THỰC TẾ DÒNG TIỀN DỰ ÁN'],
            ['Dự án: ' . $this->project->name . ' (' . ($this->project->code ?? 'N/A') . ')'],
            ['Ngày xuất báo cáo: ' . date('d/m/Y H:i')],
            [],
            ['TỔNG QUAN DÒNG TIỀN'],
            ['Chỉ số', 'Giá trị (VNĐ)'],
            ['Tổng thu thực tế', number_format($totalInflow, 0, ',', '.') . ' đ'],
            ['Tổng chi thực tế', number_format($totalOutflow, 0, ',', '.') . ' đ'],
            ['Dòng tiền ròng thực tế', number_format($netCashFlow, 0, ',', '.') . ' đ'],
            [],
            ['BẢNG TỔNG HỢP DÒNG TIỀN THEO THÁNG'],
            ['Tháng', 'Thu (KH)', 'Thu (TT)', 'Chi (KH)', 'Chi (TT)', 'Lũy kế ròng'],
        ];

        foreach ($months as $m) {
            $rows[] = [
                $m['label'] ?? $m['month'],
                number_format($m['planned_inflow'] ?? 0, 0, ',', '.') . ' đ',
                number_format($m['actual_inflow'] ?? 0, 0, ',', '.') . ' đ',
                number_format($m['planned_outflow'] ?? 0, 0, ',', '.') . ' đ',
                number_format($m['actual_outflow'] ?? 0, 0, ',', '.') . ' đ',
                number_format($m['cumulative_actual_net'] ?? 0, 0, ',', '.') . ' đ',
            ];
        }

        // Add Inflow Transactions
        $rows[] = [];
        $rows[] = ['CHI TIẾT CÁC KHOẢN THU THỰC TẾ (DOANH THU KHÁCH HÀNG)'];
        $rows[] = ['Đợt / Tên thanh toán', 'Ngày thu', 'Số tiền (VNĐ)', 'Trạng thái', 'Ghi chú'];

        if (!empty($this->actualPayments) && count($this->actualPayments) > 0) {
            foreach ($this->actualPayments as $p) {
                $rows[] = [
                    $p->name ?? ($p->payment_number ? "Đợt #{$p->payment_number}" : 'Đợt thanh toán'),
                    $p->paid_date ? date('d/m/Y', strtotime($p->paid_date)) : 'N/A',

                    number_format($p->amount ?? 0, 0, ',', '.') . ' đ',
                    $p->status === 'paid' ? 'Đã thu' : ($p->status === 'confirmed' ? 'Đã xác nhận' : $p->status),
                    $p->notes ?? '',
                ];
            }
        } else {
            $rows[] = ['Chưa có bản ghi thu thực tế', '', '', '', ''];
        }

        // Add Outflow Transactions
        $rows[] = [];
        $rows[] = ['CHI TIẾT CÁC KHOẢN CHI THỰC TẾ (CHI PHÍ ĐÃ DUYỆT)'];
        $rows[] = ['Mã chi phí', 'Loại / Danh mục', 'Ngày chi', 'Số tiền (VNĐ)', 'Đối tác / Nhà cung cấp', 'Nội dung chi'];

        if (!empty($this->actualCosts) && count($this->actualCosts) > 0) {
            foreach ($this->actualCosts as $c) {
                $partnerName = $c->supplier?->name 
                    ?? $c->subcontractor?->name 
                    ?? ($c->subcontractor_id ? "Thầu phụ #{$c->subcontractor_id}" : '—');
                
                $rows[] = [
                    $c->cost_code ?? "#{$c->id}",
                    $c->category_label ?? $c->category ?? 'Chi phí',
                    $c->cost_date ? date('d/m/Y', strtotime($c->cost_date)) : 'N/A',
                    number_format($c->amount ?? 0, 0, ',', '.') . ' đ',
                    $partnerName,
                    $c->name ?? $c->description ?? '',
                ];
            }
        } else {
            $rows[] = ['Chưa có bản ghi chi thực tế', '', '', '', '', ''];
        }

        return $rows;
    }

    public function styles(Worksheet $sheet)
    {
        return [
            1 => ['font' => ['bold' => true, 'size' => 14]],
            2 => ['font' => ['italic' => true]],
            5 => ['font' => ['bold' => true, 'size' => 12]],
            6 => ['font' => ['bold' => true], 'fill' => ['fillType' => \PhpOffice\PhpSpreadsheet\Style\Fill::FILL_SOLID, 'startColor' => ['rgb' => 'E0E0E0']]],
            11 => ['font' => ['bold' => true, 'size' => 12]],
            12 => ['font' => ['bold' => true], 'fill' => ['fillType' => \PhpOffice\PhpSpreadsheet\Style\Fill::FILL_SOLID, 'startColor' => ['rgb' => 'D0E8FF']]],
        ];
    }
}
