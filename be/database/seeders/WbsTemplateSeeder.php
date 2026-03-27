<?php

namespace Database\Seeders;

use App\Models\WbsTemplate;
use App\Models\WbsTemplateItem;
use Illuminate\Database\Seeder;

class WbsTemplateSeeder extends Seeder
{
    public function run(): void
    {
        // ==================================================================
        // TEMPLATE 1: Nhà dân dụng (Residential)
        // ==================================================================
        $residential = WbsTemplate::create([
            'name' => 'Nhà dân dụng - Xây mới',
            'project_type' => 'residential',
            'description' => 'Template WBS chuẩn cho xây dựng nhà dân dụng từ phần thô đến hoàn thiện',
        ]);

        $this->seedResidentialItems($residential->id);

        // ==================================================================
        // TEMPLATE 2: Nhà công nghiệp (Industrial)
        // ==================================================================
        $industrial = WbsTemplate::create([
            'name' => 'Nhà xưởng / Công nghiệp',
            'project_type' => 'industrial',
            'description' => 'Template WBS cho xây dựng nhà xưởng, kho bãi công nghiệp',
        ]);

        $this->seedIndustrialItems($industrial->id);

        // ==================================================================
        // TEMPLATE 3: Nội thất (Interior)
        // ==================================================================
        $interior = WbsTemplate::create([
            'name' => 'Hoàn thiện nội thất',
            'project_type' => 'interior',
            'description' => 'Template WBS cho thi công nội thất căn hộ, nhà phố, biệt thự',
        ]);

        $this->seedInteriorItems($interior->id);
    }

    private function seedResidentialItems(int $templateId): void
    {
        // ============ PHASE 1: PHẦN THÔ ============
        $phanTho = WbsTemplateItem::create([
            'template_id' => $templateId,
            'name' => 'PHẦN THÔ',
            'level' => 'phase',
            'order' => 1,
        ]);

        // --- Móng ---
        $mong = WbsTemplateItem::create([
            'template_id' => $templateId,
            'parent_id' => $phanTho->id,
            'name' => 'Thi công móng',
            'level' => 'category',
            'order' => 1,
        ]);

        $mongItems = [
            ['name' => 'Đào đất hố móng', 'default_duration' => 3, 'order' => 1],
            ['name' => 'Gia công cốt thép móng', 'default_duration' => 3, 'order' => 2],
            ['name' => 'Ghép coppha móng', 'default_duration' => 2, 'order' => 3],
            ['name' => 'Đổ bê tông lót', 'default_duration' => 1, 'order' => 4],
            ['name' => 'Đổ bê tông móng', 'default_duration' => 1, 'order' => 5],
            ['name' => 'Bảo dưỡng bê tông móng', 'default_duration' => 7, 'order' => 6],
            ['name' => 'Xây tường móng', 'default_duration' => 3, 'order' => 7],
            ['name' => 'Lấp đất, đầm nền', 'default_duration' => 2, 'order' => 8],
        ];
        foreach ($mongItems as $item) {
            WbsTemplateItem::create(array_merge($item, [
                'template_id' => $templateId,
                'parent_id' => $mong->id,
                'level' => 'task',
            ]));
        }

        // --- Kết cấu ---
        $ketCau = WbsTemplateItem::create([
            'template_id' => $templateId,
            'parent_id' => $phanTho->id,
            'name' => 'Kết cấu thân nhà',
            'level' => 'category',
            'order' => 2,
        ]);

        $ketCauItems = [
            ['name' => 'Cốt thép cột tầng 1', 'default_duration' => 3, 'order' => 1],
            ['name' => 'Coppha + đổ BT cột tầng 1', 'default_duration' => 2, 'order' => 2],
            ['name' => 'Coppha dầm sàn tầng 1', 'default_duration' => 5, 'order' => 3],
            ['name' => 'Cốt thép dầm sàn tầng 1', 'default_duration' => 4, 'order' => 4],
            ['name' => 'Đổ bê tông dầm sàn tầng 1', 'default_duration' => 1, 'order' => 5],
            ['name' => 'Bảo dưỡng BT sàn', 'default_duration' => 7, 'order' => 6],
            ['name' => 'Tháo coppha (sau 14 ngày)', 'default_duration' => 1, 'order' => 7],
            ['name' => 'Xây tường tầng 1', 'default_duration' => 7, 'order' => 8],
            ['name' => 'Cốt thép cột tầng 2', 'default_duration' => 3, 'order' => 9],
            ['name' => 'Coppha + đổ BT cột tầng 2', 'default_duration' => 2, 'order' => 10],
            ['name' => 'Coppha dầm sàn tầng 2', 'default_duration' => 5, 'order' => 11],
            ['name' => 'Cốt thép dầm sàn tầng 2', 'default_duration' => 4, 'order' => 12],
            ['name' => 'Đổ bê tông dầm sàn tầng 2', 'default_duration' => 1, 'order' => 13],
            ['name' => 'Xây tường tầng 2', 'default_duration' => 7, 'order' => 14],
            ['name' => 'Thi công mái (đổ BT/lợp tôn)', 'default_duration' => 5, 'order' => 15],
        ];
        foreach ($ketCauItems as $item) {
            WbsTemplateItem::create(array_merge($item, [
                'template_id' => $templateId,
                'parent_id' => $ketCau->id,
                'level' => 'task',
            ]));
        }

        // ============ PHASE 2: HOÀN THIỆN ============
        $hoanThien = WbsTemplateItem::create([
            'template_id' => $templateId,
            'name' => 'HOÀN THIỆN',
            'level' => 'phase',
            'order' => 2,
        ]);

        // --- Tô trát ---
        $toTrat = WbsTemplateItem::create([
            'template_id' => $templateId,
            'parent_id' => $hoanThien->id,
            'name' => 'Tô trát',
            'level' => 'category',
            'order' => 1,
        ]);

        $toTratItems = [
            ['name' => 'Tô trát tường trong', 'default_duration' => 10, 'order' => 1],
            ['name' => 'Tô trát tường ngoài', 'default_duration' => 7, 'order' => 2],
            ['name' => 'Tô trát trần', 'default_duration' => 5, 'order' => 3],
        ];
        foreach ($toTratItems as $item) {
            WbsTemplateItem::create(array_merge($item, [
                'template_id' => $templateId,
                'parent_id' => $toTrat->id,
                'level' => 'task',
            ]));
        }

        // --- Lát gạch ---
        $latGach = WbsTemplateItem::create([
            'template_id' => $templateId,
            'parent_id' => $hoanThien->id,
            'name' => 'Ốp lát',
            'level' => 'category',
            'order' => 2,
        ]);

        $latGachItems = [
            ['name' => 'Lát gạch nền tầng 1', 'default_duration' => 5, 'order' => 1],
            ['name' => 'Lát gạch nền tầng 2', 'default_duration' => 5, 'order' => 2],
            ['name' => 'Ốp gạch WC, bếp', 'default_duration' => 5, 'order' => 3],
            ['name' => 'Ốp gạch mặt tiền', 'default_duration' => 5, 'order' => 4],
        ];
        foreach ($latGachItems as $item) {
            WbsTemplateItem::create(array_merge($item, [
                'template_id' => $templateId,
                'parent_id' => $latGach->id,
                'level' => 'task',
            ]));
        }

        // --- Sơn ---
        $son = WbsTemplateItem::create([
            'template_id' => $templateId,
            'parent_id' => $hoanThien->id,
            'name' => 'Sơn nước',
            'level' => 'category',
            'order' => 3,
        ]);

        $sonItems = [
            ['name' => 'Bả mastic tường', 'default_duration' => 5, 'order' => 1],
            ['name' => 'Sơn lót', 'default_duration' => 2, 'order' => 2],
            ['name' => 'Sơn phủ 2 lớp', 'default_duration' => 3, 'order' => 3],
        ];
        foreach ($sonItems as $item) {
            WbsTemplateItem::create(array_merge($item, [
                'template_id' => $templateId,
                'parent_id' => $son->id,
                'level' => 'task',
            ]));
        }

        // ============ PHASE 3: M&E ============
        $me = WbsTemplateItem::create([
            'template_id' => $templateId,
            'name' => 'CƠ ĐIỆN (M&E)',
            'level' => 'phase',
            'order' => 3,
        ]);

        $dienItems = [
            ['name' => 'Đi ống điện âm tường', 'default_duration' => 5, 'order' => 1],
            ['name' => 'Kéo dây điện', 'default_duration' => 3, 'order' => 2],
            ['name' => 'Lắp tủ điện, CB', 'default_duration' => 2, 'order' => 3],
            ['name' => 'Lắp đèn, ổ cắm, công tắc', 'default_duration' => 3, 'order' => 4],
            ['name' => 'Đi ống nước cấp', 'default_duration' => 3, 'order' => 5],
            ['name' => 'Đi ống nước thoát', 'default_duration' => 3, 'order' => 6],
            ['name' => 'Lắp thiết bị vệ sinh', 'default_duration' => 3, 'order' => 7],
            ['name' => 'Lắp đặt điều hòa', 'default_duration' => 2, 'order' => 8],
        ];
        foreach ($dienItems as $item) {
            WbsTemplateItem::create(array_merge($item, [
                'template_id' => $templateId,
                'parent_id' => $me->id,
                'level' => 'task',
            ]));
        }

        // ============ PHASE 4: NGHIỆM THU & BÀN GIAO ============
        $nghiemThu = WbsTemplateItem::create([
            'template_id' => $templateId,
            'name' => 'NGHIỆM THU & BÀN GIAO',
            'level' => 'phase',
            'order' => 4,
        ]);

        $nghiemThuItems = [
            ['name' => 'Vệ sinh công trình', 'default_duration' => 2, 'order' => 1],
            ['name' => 'Nghiệm thu nội bộ', 'default_duration' => 2, 'order' => 2],
            ['name' => 'Nghiệm thu với CĐT', 'default_duration' => 2, 'order' => 3],
            ['name' => 'Sửa chữa tồn đọng', 'default_duration' => 3, 'order' => 4],
            ['name' => 'Bàn giao công trình', 'default_duration' => 1, 'order' => 5],
        ];
        foreach ($nghiemThuItems as $item) {
            WbsTemplateItem::create(array_merge($item, [
                'template_id' => $templateId,
                'parent_id' => $nghiemThu->id,
                'level' => 'task',
            ]));
        }
    }

    private function seedIndustrialItems(int $templateId): void
    {
        $phases = [
            ['name' => 'CHUẨN BỊ MẶT BẰNG', 'items' => [
                ['name' => 'Giải phóng mặt bằng', 'default_duration' => 5],
                ['name' => 'San lấp mặt bằng', 'default_duration' => 10],
                ['name' => 'Đo đạc định vị', 'default_duration' => 2],
                ['name' => 'Rào chắn công trình', 'default_duration' => 3],
            ]],
            ['name' => 'NỀN MÓNG', 'items' => [
                ['name' => 'Ép cọc bê tông', 'default_duration' => 15],
                ['name' => 'Đào đất hố móng', 'default_duration' => 5],
                ['name' => 'Đổ BT lót', 'default_duration' => 2],
                ['name' => 'Gia công + đổ BT móng', 'default_duration' => 7],
                ['name' => 'San lấp + đầm nền', 'default_duration' => 10],
                ['name' => 'Đổ BT nền xưởng', 'default_duration' => 5],
            ]],
            ['name' => 'KẾT CẤU THÉP', 'items' => [
                ['name' => 'Gia công kết cấu thép tại xưởng', 'default_duration' => 20],
                ['name' => 'Vận chuyển KCT', 'default_duration' => 3],
                ['name' => 'Lắp dựng cột thép', 'default_duration' => 10],
                ['name' => 'Lắp dựng kèo mái', 'default_duration' => 10],
                ['name' => 'Lắp xà gồ + giằng', 'default_duration' => 7],
                ['name' => 'Lợp tôn mái', 'default_duration' => 7],
                ['name' => 'Bao che tôn vách', 'default_duration' => 7],
            ]],
            ['name' => 'CƠ ĐIỆN NHÀ XƯỞNG', 'items' => [
                ['name' => 'Hệ thống điện động lực', 'default_duration' => 10],
                ['name' => 'Hệ thống chiếu sáng', 'default_duration' => 5],
                ['name' => 'Hệ thống PCCC', 'default_duration' => 7],
                ['name' => 'Hệ thống thoát nước', 'default_duration' => 5],
                ['name' => 'Thông gió', 'default_duration' => 5],
            ]],
            ['name' => 'HOÀN THIỆN', 'items' => [
                ['name' => 'Sơn kẻ vạch nền', 'default_duration' => 3],
                ['name' => 'Lắp cửa cuốn, cửa đi', 'default_duration' => 5],
                ['name' => 'Sân bãi, đường nội bộ', 'default_duration' => 10],
                ['name' => 'Cây xanh, cảnh quan', 'default_duration' => 5],
                ['name' => 'Nghiệm thu + bàn giao', 'default_duration' => 3],
            ]],
        ];

        foreach ($phases as $pi => $phase) {
            $p = WbsTemplateItem::create([
                'template_id' => $templateId,
                'name' => $phase['name'],
                'level' => 'phase',
                'order' => $pi + 1,
            ]);
            foreach ($phase['items'] as $ii => $item) {
                WbsTemplateItem::create([
                    'template_id' => $templateId,
                    'parent_id' => $p->id,
                    'name' => $item['name'],
                    'default_duration' => $item['default_duration'],
                    'level' => 'task',
                    'order' => $ii + 1,
                ]);
            }
        }
    }

    private function seedInteriorItems(int $templateId): void
    {
        $phases = [
            ['name' => 'KHẢO SÁT & THIẾT KẾ', 'items' => [
                ['name' => 'Khảo sát hiện trạng', 'default_duration' => 2],
                ['name' => 'Thiết kế concept', 'default_duration' => 5],
                ['name' => 'Thiết kế chi tiết', 'default_duration' => 7],
                ['name' => 'Duyệt thiết kế với CĐT', 'default_duration' => 3],
            ]],
            ['name' => 'PHÁ DỠ & CHUẨN BỊ', 'items' => [
                ['name' => 'Phá dỡ nội thất cũ', 'default_duration' => 3],
                ['name' => 'Xử lý tường, trần, sàn', 'default_duration' => 5],
                ['name' => 'Đi lại hệ thống điện', 'default_duration' => 5],
                ['name' => 'Đi lại hệ thống nước', 'default_duration' => 3],
            ]],
            ['name' => 'THI CÔNG NỘI THẤT', 'items' => [
                ['name' => 'Trần thạch cao', 'default_duration' => 5],
                ['name' => 'Ốp lát sàn gỗ/gạch', 'default_duration' => 5],
                ['name' => 'Ốp tường trang trí', 'default_duration' => 3],
                ['name' => 'Sơn bả toàn bộ', 'default_duration' => 5],
                ['name' => 'Lắp đặt tủ bếp', 'default_duration' => 3],
                ['name' => 'Lắp đặt tủ quần áo', 'default_duration' => 3],
                ['name' => 'Lắp đặt cửa gỗ', 'default_duration' => 3],
            ]],
            ['name' => 'LẮP ĐẶT THIẾT BỊ', 'items' => [
                ['name' => 'Thiết bị vệ sinh', 'default_duration' => 2],
                ['name' => 'Đèn chiếu sáng', 'default_duration' => 2],
                ['name' => 'Điều hòa, quạt', 'default_duration' => 2],
                ['name' => 'Rèm cửa', 'default_duration' => 1],
                ['name' => 'Thiết bị bếp', 'default_duration' => 2],
            ]],
            ['name' => 'HOÀN THIỆN & BÀN GIAO', 'items' => [
                ['name' => 'Vệ sinh tổng thể', 'default_duration' => 2],
                ['name' => 'Bài trí, decor', 'default_duration' => 2],
                ['name' => 'Nghiệm thu nội bộ', 'default_duration' => 1],
                ['name' => 'Nghiệm thu với CĐT', 'default_duration' => 1],
                ['name' => 'Bàn giao', 'default_duration' => 1],
            ]],
        ];

        foreach ($phases as $pi => $phase) {
            $p = WbsTemplateItem::create([
                'template_id' => $templateId,
                'name' => $phase['name'],
                'level' => 'phase',
                'order' => $pi + 1,
            ]);
            foreach ($phase['items'] as $ii => $item) {
                WbsTemplateItem::create([
                    'template_id' => $templateId,
                    'parent_id' => $p->id,
                    'name' => $item['name'],
                    'default_duration' => $item['default_duration'],
                    'level' => 'task',
                    'order' => $ii + 1,
                ]);
            }
        }
    }
}
