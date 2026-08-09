<?php

namespace App\Exports;

use Maatwebsite\Excel\Concerns\FromArray;
use Maatwebsite\Excel\Concerns\WithTitle;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use Maatwebsite\Excel\Concerns\WithStyles;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

class PettyCashTransactionsExport implements FromArray, WithTitle, ShouldAutoSize, WithStyles
{
    protected $transactions;

    public function __construct($transactions)
    {
        $this->transactions = $transactions;
    }

    public function title(): string
    {
        return 'Sổ quỹ tiền mặt';
    }

    public function array(): array
    {
        $rows = [
            ['SỔ QUỸ TIỀN MẶT CÔNG TY'],
            ['Ngày xuất báo cáo: ' . now()->format('d/m/Y H:i')],
            [''],
            [
                'STT',
                'Mã phiếu',
                'Phân loại',
                'Loại giao dịch',
                'Số tiền (VNĐ)',
                'Ngày chứng từ',
                'Đối tượng nộp / nhận',
                'Dự án liên quan',
                'Nội dung / Lý do thu chi',
                'Trạng thái',
                'Người lập',
                'Người duyệt'
            ]
        ];

        $stt = 1;
        $totalIn = 0;
        $totalOut = 0;

        foreach ($this->transactions as $t) {
            $typeLabel = $t->type === 'inflow' ? 'Thu tiền mặt' : 'Chi tiền mặt';
            if ($t->type === 'inflow') {
                $totalIn += (float) $t->amount;
            } else {
                $totalOut += (float) $t->amount;
            }

            $catLabel = match ($t->category) {
                'tam_ung'       => 'Tạm ứng',
                'chi_phi_vp'    => 'Chi phí văn phòng',
                'chi_phi_ct'    => 'Chi phí công trình',
                'nop_quy'       => 'Nộp quỹ tiền mặt',
                'hoan_ung'      => 'Hoàn ứng',
                'thanh_toan_kh' => 'Thu tiền khách hàng',
                default         => 'Khác'
            };

            $statusLabel = match ($t->status) {
                'draft'            => 'Nháp',
                'pending_approval' => 'Chờ duyệt',
                'completed'        => 'Đã hoàn tất',
                'rejected'         => 'Từ chối',
                default            => $t->status
            };

            $payer = $t->user ? $t->user->name : ($t->payer_receiver_name ?: '—');

            $rows[] = [
                $stt++,
                $t->code,
                $typeLabel,
                $catLabel,
                number_format((float) $t->amount, 0, ',', '.') . ' đ',
                $t->transaction_date ? \Carbon\Carbon::parse($t->transaction_date)->format('d/m/Y') : '—',
                $payer,
                $t->project ? $t->project->name : '—',
                $t->description ?: '—',
                $statusLabel,
                $t->creator ? $t->creator->name : '—',
                $t->approver ? $t->approver->name : '—'
            ];
        }

        $rows[] = [''];
        $rows[] = ['', '', '', 'TỔNG THU TIỀN MẶT:', number_format($totalIn, 0, ',', '.') . ' đ'];
        $rows[] = ['', '', '', 'TỔNG CHI TIỀN MẶT:', number_format($totalOut, 0, ',', '.') . ' đ'];
        $rows[] = ['', '', '', 'TỒN QUỸ TIỀN MẶT:', number_format($totalIn - $totalOut, 0, ',', '.') . ' đ'];

        return $rows;
    }

    public function styles(Worksheet $sheet)
    {
        $sheet->mergeCells('A1:L1');
        $sheet->mergeCells('A2:L2');

        $sheet->getStyle('A1')->getFont()->setBold(true)->setSize(16);
        $sheet->getStyle('A2')->getFont()->setItalic(true)->setSize(10);
        $sheet->getStyle('A4:L4')->getFont()->setBold(true);

        return [
            4 => [
                'font' => ['bold' => true],
                'fill' => [
                    'fillType' => \PhpOffice\PhpSpreadsheet\Style\Fill::FILL_SOLID,
                    'startColor' => ['rgb' => 'E2EFDA']
                ]
            ],
        ];
    }
}
