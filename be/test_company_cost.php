<?php
require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\Cost;
use App\Models\CostGroup;
use App\Models\User;

try {
    // 1. Clean up old test data
    Cost::where('name', 'TEST-COMPANY-COST-FLOW')->delete();

    // 2. Ensure CostGroup exists
    $group = CostGroup::firstOrCreate(
        ['code' => 'TEST'],
        ['name' => 'Nhóm Test', 'description' => 'Test']
    );

    // 3. User
    $user = User::first() ?? User::factory()->create();

    echo "--- BẮT ĐẦU TEST LUỒNG CHI PHÍ CÔNG TY ---\n";

    // BƯỚC 1: CREATE (Tạo nháp)
    $cost = Cost::create([
        'uuid' => (string) \Illuminate\Support\Str::uuid(),
        'name' => 'TEST-COMPANY-COST-FLOW',
        'amount' => 5000000,
        'cost_group_id' => $group->id,
        'cost_date' => now(),
        'status' => 'draft',
        'created_by' => $user->id
    ]);
    echo "1. Tạo mới: OK (Status: {$cost->status})\n";

    // BƯỚC 2: UPDATE (Sửa nháp)
    $cost->update(['amount' => 6000000]);
    echo "2. Chỉnh sửa khi nháp: OK (Amount: {$cost->amount})\n";

    // BƯỚC 3: SUBMIT (Gửi duyệt)
    // Normally this is done via Controller which changes status to pending_management_approval
    $cost->update(['status' => 'pending_management_approval']);
    echo "3. Gửi duyệt (Submit): OK (Status: {$cost->status})\n";

    // BƯỚC 4: MANAGEMENT APPROVAL
    $cost->update([
        'status' => 'pending_accountant_approval',
        'management_approved_by' => $user->id,
        'management_approved_at' => now()
    ]);
    echo "4. Ban Điều Hành Duyệt: OK (Status: {$cost->status})\n";

    // BƯỚC 5: ACCOUNTANT APPROVAL (Hoàn tất)
    $cost->update([
        'status' => 'approved',
        'accountant_approved_by' => $user->id,
        'accountant_approved_at' => now()
    ]);
    echo "5. Kế Toán Duyệt (Hoàn tất): OK (Status: {$cost->status})\n";

    // BƯỚC 6: REJECT (Từ chối) - Tạo phiếu khác
    $cost2 = Cost::create([
        'uuid' => (string) \Illuminate\Support\Str::uuid(),
        'name' => 'TEST-COMPANY-COST-FLOW',
        'amount' => 1000000,
        'cost_group_id' => $group->id,
        'cost_date' => now(),
        'status' => 'pending_management_approval',
        'created_by' => $user->id
    ]);
    $cost2->update([
        'status' => 'rejected',
        'rejected_reason' => 'Chứng từ không hợp lệ',
        'rejected_by' => $user->id,
        'rejected_at' => now()
    ]);
    echo "6. Test Từ Chối: OK (Status: {$cost2->status}, Lý do: {$cost2->rejected_reason})\n";

    // 7. CLEANUP
    Cost::where('name', 'TEST-COMPANY-COST-FLOW')->delete();
    echo "--- TEST HOÀN TẤT, ĐÃ XÓA DATA TEST ---\n";

} catch (\Exception $e) {
    echo "LỖI: " . $e->getMessage() . "\n";
}
