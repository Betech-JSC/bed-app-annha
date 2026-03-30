<?php

namespace Database\Seeders;

use App\Models\AcceptanceStage;
use App\Models\AdditionalCost;
use App\Models\Attendance;
use App\Models\ChangeRequest;
use App\Models\ConstructionLog;
use App\Models\Contract;
use App\Models\Cost;
use App\Models\CostGroup;
use App\Models\Defect;
use App\Models\Equipment;
use App\Models\EquipmentAllocation;
use App\Models\LaborProductivity;
use App\Models\MaterialBill;
use App\Models\MaterialBillItem;
use App\Models\Project;
use App\Models\ProjectBudget;
use App\Models\ProjectPayment;
use App\Models\ProjectPersonnel;
use App\Models\ProjectPhase;
use App\Models\ProjectRisk;
use App\Models\ProjectTask;
use App\Models\Subcontractor;
use App\Models\SubcontractorAcceptance;
use App\Models\SubcontractorPayment;
use App\Models\Supplier;
use App\Models\SupplierAcceptance;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * FullSystemTestSeeder
 * 
 * Seeder toàn diện tạo dữ liệu test cho TẤT CẢ modules:
 * 
 * 1. Dự án (3 dự án, đa trạng thái)
 * 2. Hợp đồng & Thanh toán
 * 3. Giai đoạn & Công việc (WBS)
 * 4. Chi phí (đa workflow: draft → BĐH → KT → approved)
 * 5. Chi phí phát sinh
 * 6. Nhà thầu phụ & Thanh toán NTP
 * 7. Nghiệm thu NTP & NCC
 * 8. Nhà cung cấp & Phiếu vật tư
 * 9. Nhật ký công trường
 * 10. Sai sót / Defects
 * 11. Yêu cầu thay đổi (Change Requests)
 * 12. Chấm công (Attendance)
 * 13. Năng suất lao động (Labor Productivity)
 * 14. Thiết bị & Phân bổ
 * 15. Ngân sách dự án
 * 16. Rủi ro dự án
 * 
 * Chạy: php artisan db:seed --class=FullSystemTestSeeder
 */
class FullSystemTestSeeder extends Seeder
{
    private ?User $superAdmin;
    private ?User $admin;
    private ?User $owner;
    private ?User $pm1;
    private ?User $pm2;
    private ?User $accountant;
    private ?User $client1;
    private ?User $client2;
    private ?User $supervisor1;
    private ?User $supervisor2;

    public function run(): void
    {
        $this->command->info('');
        $this->command->info('╔═══════════════════════════════════════════════════════╗');
        $this->command->info('║  🔥 FULL SYSTEM TEST SEEDER — BED Construction CRM   ║');
        $this->command->info('╠═══════════════════════════════════════════════════════╣');
        $this->command->info('║  Tạo dữ liệu test cho 16 modules                    ║');
        $this->command->info('╚═══════════════════════════════════════════════════════╝');
        $this->command->info('');

        // ── Resolve Users ──
        $this->resolveUsers();
        if (!$this->superAdmin) {
            $this->command->error('❌ Không tìm thấy user nào! Hãy chạy DatabaseSeeder trước.');
            return;
        }

        DB::beginTransaction();

        try {
            // ── 1. Dự án ──
            $projects = $this->seedProjects();
            $this->command->info("✅ Đã tạo " . count($projects) . " dự án");

            foreach ($projects as $project) {
                $this->command->info("  📂 [{$project->code}] {$project->name}");

                // ── 2. Nhân sự dự án ──
                $this->seedProjectPersonnel($project);

                // ── 3. Giai đoạn & Công việc ──
                $phases = $this->seedPhasesAndTasks($project);

                // ── 4. Hợp đồng & Thanh toán ──
                $contract = $this->seedContract($project);
                $this->seedPayments($project, $contract);

                // ── 5. Chi phí ──
                $this->seedCosts($project);

                // ── 6. Chi phí phát sinh ──
                $this->seedAdditionalCosts($project);

                // ── 7. Nhà thầu phụ & Thanh toán NTP ──
                $subcontractors = $this->seedSubcontractors($project);
                $this->seedSubPayments($project, $subcontractors);
                $this->seedSubAcceptances($project, $subcontractors);

                // ── 8. Nhà cung cấp & Phiếu vật tư ──
                $suppliers = $this->seedSuppliers();
                $materials = $this->seedMaterials();
                $this->seedMaterialBills($project, $suppliers, $materials);

                // ── 9. Nghiệm thu NCC ──
                $this->seedSupplierAcceptances($project, $suppliers);

                // ── 10. Nghiệm thu KH (Acceptance Stages) ──
                $this->seedAcceptanceStages($project);

                // ── 11. Nhật ký công trường ──
                $this->seedConstructionLogs($project);

                // ── 12. Sai sót ──
                $this->seedDefects($project);

                // ── 13. Yêu cầu thay đổi ──
                $this->seedChangeRequests($project);

                // ── 14. Chấm công ──
                $this->seedAttendance($project);

                // ── 15. Năng suất lao động ──
                $this->seedLaborProductivity($project);

                // ── 16. Ngân sách ──
                $this->seedBudgets($project, $contract);

                // ── 17. Rủi ro ──
                $this->seedRisks($project);
            }

            // ── 18. Thiết bị ──
            $this->seedEquipment($projects);

            DB::commit();

            $this->printSummary();

        } catch (\Exception $e) {
            DB::rollBack();
            $this->command->error("❌ Lỗi: " . $e->getMessage());
            $this->command->error($e->getTraceAsString());
        }
    }

    // ====================================================================
    // RESOLVE USERS
    // ====================================================================

    private function resolveUsers(): void
    {
        // Thử RBAC users trước, fallback sang user đầu tiên
        $this->superAdmin = User::where('email', 'superadmin.test@test.com')->first()
            ?? User::where('owner', true)->first()
            ?? User::first();

        $this->admin = User::where('email', 'admin1@test.com')->first() ?? $this->superAdmin;
        $this->owner = User::where('email', 'projectowner1@test.com')->first() ?? $this->superAdmin;
        $this->pm1 = User::where('email', 'pm1@test.com')->first() ?? $this->superAdmin;
        $this->pm2 = User::where('email', 'pm2@test.com')->first() ?? $this->pm1;
        $this->accountant = User::where('email', 'accountant1@test.com')->first() ?? $this->superAdmin;
        $this->client1 = User::where('email', 'client1@test.com')->first() ?? $this->superAdmin;
        $this->client2 = User::where('email', 'client2@test.com')->first() ?? $this->client1;
        $this->supervisor1 = User::where('email', 'supervisor1@test.com')->first() ?? $this->superAdmin;
        $this->supervisor2 = User::where('email', 'supervisor2@test.com')->first() ?? $this->supervisor1;
    }

    // ====================================================================
    // 1. DỰ ÁN (3 projects, đa trạng thái)
    // ====================================================================

    private function seedProjects(): array
    {
        $projectsData = [
            [
                'name' => 'Biệt thự Phú Mỹ Hưng - Khu A',
                'description' => 'Xây dựng biệt thự cao cấp 3 tầng, diện tích 450m², tại khu A Phú Mỹ Hưng, Q7, TP.HCM',
                'status' => 'in_progress',
                'customer_id' => $this->client1->id,
                'project_manager_id' => $this->pm1->id,
                'start_date' => now()->subMonths(4),
                'end_date' => now()->addMonths(8),
            ],
            [
                'name' => 'Nhà phố liền kề Thảo Điền',
                'description' => 'Thi công nhà phố 4 tầng, 120m², tại Thảo Điền, TP. Thủ Đức',
                'status' => 'in_progress',
                'customer_id' => $this->client2->id,
                'project_manager_id' => $this->pm2->id,
                'start_date' => now()->subMonths(2),
                'end_date' => now()->addMonths(10),
            ],
            [
                'name' => 'Cải tạo văn phòng Bitexco',
                'description' => 'Cải tạo nội thất văn phòng tầng 25, tòa nhà Bitexco, Q1. DT 300m²',
                'status' => 'planning',
                'customer_id' => $this->client1->id,
                'project_manager_id' => $this->pm1->id,
                'start_date' => now()->addWeeks(2),
                'end_date' => now()->addMonths(3),
            ],
        ];

        $projects = [];
        foreach ($projectsData as $data) {
            $projects[] = Project::create(array_merge($data, [
                'created_by' => $this->superAdmin->id,
            ]));
        }
        return $projects;
    }

    // ====================================================================
    // 2. NHÂN SỰ DỰ ÁN
    // ====================================================================

    private function seedProjectPersonnel(Project $project): void
    {
        // Tìm PersonnelRole IDs
        $roles = \App\Models\PersonnelRole::all()->keyBy('code');
        
        $assignments = [
            ['user' => $this->pm1, 'role_code' => 'project_manager'],
            ['user' => $this->supervisor1, 'role_code' => 'supervisor'],
            ['user' => $this->accountant, 'role_code' => 'accountant'],
            ['user' => $this->supervisor2, 'role_code' => 'supervisor'],
            ['user' => $this->admin, 'role_code' => 'management'],
        ];

        foreach ($assignments as $assignment) {
            $roleId = $roles->get($assignment['role_code'])?->id;
            if (!$roleId) continue;

            ProjectPersonnel::firstOrCreate(
                ['project_id' => $project->id, 'user_id' => $assignment['user']->id],
                [
                    'project_id' => $project->id,
                    'user_id' => $assignment['user']->id,
                    'role_id' => $roleId,
                    'assigned_by' => $this->superAdmin->id,
                    'assigned_at' => $project->start_date,
                ]
            );
        }
    }

    // ====================================================================
    // 3. GIAI ĐOẠN & CÔNG VIỆC (WBS)
    // ====================================================================

    private function seedPhasesAndTasks(Project $project): array
    {
        $phasesData = [
            ['Phần móng', [
                'Đào đất, san nền' => 15,
                'Đóng cọc bê tông' => 20,
                'Đổ bê tông móng' => 10,
                'Xây tường móng' => 12,
            ]],
            ['Phần thân', [
                'Xây tường tầng 1' => 18,
                'Đổ sàn tầng 2' => 8,
                'Xây tường tầng 2' => 18,
                'Đổ sàn tầng 3' => 8,
                'Xây tường tầng 3' => 15,
                'Đổ sàn mái' => 10,
            ]],
            ['Hoàn thiện', [
                'Tô trát trong nhà' => 20,
                'Tô trát ngoài nhà' => 15,
                'Lắp điện nước' => 25,
                'Ốp lát gạch' => 20,
                'Sơn nước hoàn thiện' => 12,
            ]],
            ['Ngoại thất & Bàn giao', [
                'Sân vườn, hàng rào' => 15,
                'Cổng, lối đi' => 10,
                'Vệ sinh công trình' => 5,
                'Bàn giao KH' => 3,
            ]],
        ];

        $allPhases = [];
        $taskOrder = 1;
        $currentDate = $project->start_date ?? now()->subMonths(3);

        foreach ($phasesData as $idx => [$phaseName, $tasks]) {
            $phase = ProjectPhase::create([
                'project_id' => $project->id,
                'name' => $phaseName,
                'order' => $idx + 1,
                'start_date' => $currentDate->copy(),
                'end_date' => $currentDate->copy()->addDays(collect($tasks)->sum()),
                'created_by' => $this->admin->id,
            ]);

            foreach ($tasks as $taskName => $duration) {
                $taskStart = $currentDate->copy();
                $taskEnd = $currentDate->copy()->addDays($duration);

                $progress = match (true) {
                    $taskEnd->isPast() => 100,
                    $taskStart->isPast() && $taskEnd->isFuture() => rand(20, 80),
                    default => 0,
                };

                $status = match (true) {
                    $progress >= 100 => 'completed',
                    $progress > 0 => 'in_progress',
                    default => 'not_started',
                };

                ProjectTask::create([
                    'project_id' => $project->id,
                    'phase_id' => $phase->id,
                    'name' => $taskName,
                    'order' => $taskOrder++,
                    'start_date' => $taskStart,
                    'end_date' => $taskEnd,
                    'duration' => $duration,
                    'assigned_to' => collect([$this->pm1, $this->supervisor1, $this->supervisor2])->random()->id,
                    'created_by' => $this->pm1->id,
                ]);

                $currentDate->addDays(intval($duration * 0.7)); // overlap tasks
            }

            $allPhases[] = $phase;
        }

        return $allPhases;
    }

    // ====================================================================
    // 4. HỢP ĐỒNG
    // ====================================================================

    private function seedContract(Project $project): Contract
    {
        $values = [15000000000, 8500000000, 3200000000]; // 15 tỷ, 8.5 tỷ, 3.2 tỷ
        $projectIdx = Project::where('id', '<=', $project->id)->count() - 1;

        return Contract::firstOrCreate(
            ['project_id' => $project->id],
            [
                'project_id' => $project->id,
                'contract_value' => $values[$projectIdx] ?? $values[0],
                'signed_date' => $project->start_date,
                'status' => $project->status === 'planning' ? 'pending_customer_approval' : 'approved',
                'approved_by' => $project->status !== 'planning' ? $this->superAdmin->id : null,
                'approved_at' => $project->status !== 'planning' ? $project->start_date : null,
            ]
        );
    }

    // ====================================================================
    // 5. THANH TOÁN DỰ ÁN
    // ====================================================================

    private function seedPayments(Project $project, Contract $contract): void
    {
        if ($contract->status === 'pending_customer_approval') return;

        $stages = [
            ['Tạm ứng (30%)', 0.30, 'paid'],
            ['Đợt 2 - Phần móng (20%)', 0.20, 'paid'],
            ['Đợt 3 - Phần thân (25%)', 0.25, 'customer_pending_approval'],
            ['Đợt 4 - Hoàn thiện (15%)', 0.15, 'pending'],
            ['Đợt 5 - Bàn giao (10%)', 0.10, 'pending'],
        ];

        foreach ($stages as $i => [$desc, $pct, $status]) {
            $paymentNum = 'TT-' . str_pad($i + 1, 3, '0', STR_PAD_LEFT);
            ProjectPayment::firstOrCreate(
                ['project_id' => $project->id, 'payment_number' => $paymentNum],
                [
                    'project_id' => $project->id,
                    'contract_id' => $contract->id,
                    'payment_number' => $paymentNum,
                    'amount' => $contract->contract_value * $pct,
                    'notes' => $desc,
                    'due_date' => ($project->start_date ?? now())->copy()->addMonths($i * 2),
                    'status' => $status,
                    'paid_date' => $status === 'paid' ? now()->subMonths(5 - $i) : null,
                    'confirmed_by' => $status === 'paid' ? $this->accountant->id : null,
                    'confirmed_at' => $status === 'paid' ? now()->subMonths(5 - $i) : null,
                ]
            );
        }
    }

    // ====================================================================
    // 6. CHI PHÍ (đa workflow trạng thái)
    // ====================================================================

    private function seedCosts(Project $project): void
    {
        $costGroups = CostGroup::all();
        if ($costGroups->isEmpty()) $costGroups = collect([null]);

        $costItems = [
            // [name, category, amount, status]
            ['Xi măng Hà Tiên PCB40', 'construction_materials', 125000000, 'approved'],
            ['Thép Pomina D10-D25', 'construction_materials', 380000000, 'approved'],
            ['Bê tông tươi M300', 'concrete', 245000000, 'pending_accountant_approval'],
            ['Gạch xây Đồng Nai', 'construction_materials', 85000000, 'pending_management_approval'],
            ['Nhân công đổ bê tông', 'labor', 120000000, 'approved'],
            ['Thuê cần trục 50T', 'equipment', 95000000, 'pending_management_approval'],
            ['Vận chuyển vật liệu', 'transportation', 45000000, 'draft'],
            ['Cát xây dựng', 'construction_materials', 35000000, 'approved'],
            ['Ống nước Bình Minh', 'construction_materials', 62000000, 'rejected'],
            ['Dây điện Cadivi', 'construction_materials', 48000000, 'pending_accountant_approval'],
            ['Tiền ăn công nhân T3', 'other', 32000000, 'approved'],
            ['Xăng xe chở vật liệu', 'transportation', 18000000, 'draft'],
        ];

        foreach ($costItems as [$name, $category, $amount, $status]) {
            $costGroupId = $costGroups->random()?->id;

            Cost::create([
                'project_id' => $project->id,
                'name' => $name,
                'category' => $category,
                'cost_group_id' => $costGroupId,
                'amount' => $amount,
                'description' => "Chi phí {$name} cho dự án {$project->name}",
                'cost_date' => now()->subDays(rand(5, 60)),
                'status' => $status,
                'created_by' => $this->pm1->id,
                'management_approved_by' => in_array($status, ['pending_accountant_approval', 'approved']) ? $this->owner->id : null,
                'management_approved_at' => in_array($status, ['pending_accountant_approval', 'approved']) ? now()->subDays(rand(3, 20)) : null,
                'accountant_approved_by' => $status === 'approved' ? $this->accountant->id : null,
                'accountant_approved_at' => $status === 'approved' ? now()->subDays(rand(1, 10)) : null,
                'rejected_reason' => $status === 'rejected' ? 'Giá cao hơn thị trường, đề nghị chọn nhà cung cấp khác' : null,
            ]);
        }

        // Tạo thêm 3 chi phí CÔNG TY (không gắn project)
        $companyCosts = [
            ['Tiền thuê văn phòng T3/2026', 'other', 35000000, 'pending_management_approval'],
            ['Phí bảo hiểm nhân sự Q1', 'other', 48000000, 'approved'],
            ['Mua laptop Dell cho PM', 'equipment', 28000000, 'draft'],
        ];

        foreach ($companyCosts as [$name, $category, $amount, $status]) {
            Cost::create([
                'project_id' => null,
                'name' => $name,
                'category' => $category,
                'amount' => $amount,
                'description' => "Chi phí công ty: {$name}",
                'cost_date' => now()->subDays(rand(1, 30)),
                'status' => $status,
                'created_by' => $this->admin->id,
                'management_approved_by' => $status === 'approved' ? $this->owner->id : null,
                'management_approved_at' => $status === 'approved' ? now()->subDays(5) : null,
                'accountant_approved_by' => $status === 'approved' ? $this->accountant->id : null,
                'accountant_approved_at' => $status === 'approved' ? now()->subDays(3) : null,
            ]);
        }
    }

    // ====================================================================
    // 7. CHI PHÍ PHÁT SINH
    // ====================================================================

    private function seedAdditionalCosts(Project $project): void
    {
        $items = [
            ['Thay đổi tường chịu lực tầng 2 theo yêu cầu KH', 185000000, 'approved'],
            ['Bổ sung hệ thống chống thấm mái', 65000000, 'pending_approval'],
            ['Gia cố nền móng khu vực sân', 120000000, 'pending_approval'],
            ['Nâng cấp hệ thống PCCC theo tiêu chuẩn mới', 95000000, 'rejected'],
        ];

        foreach ($items as [$desc, $amount, $status]) {
            AdditionalCost::create([
                'project_id' => $project->id,
                'amount' => $amount,
                'description' => $desc,
                'status' => $status,
                'proposed_by' => $this->pm1->id,
                'approved_by' => $status === 'approved' ? $this->client1->id : null,
                'approved_at' => $status === 'approved' ? now()->subDays(rand(3, 15)) : null,
                'rejected_reason' => $status === 'rejected' ? 'Chi phí vượt ngân sách cho phép' : null,
            ]);
        }
    }

    // ====================================================================
    // 8. NHÀ THẦU PHỤ
    // ====================================================================

    private function seedSubcontractors(Project $project): array
    {
        $subs = [
            ['Nhà thầu điện - Đại Phát', 'Hệ thống điện', 850000000],
            ['Nhà thầu nước - Bình Minh', 'Hệ thống nước', 420000000],
            ['Nhà thầu sơn - Jotun Pro', 'Sơn nước', 280000000],
        ];

        $subcontractors = [];
        foreach ($subs as [$name, $category, $quote]) {
            $subcontractors[] = Subcontractor::create([
                'project_id' => $project->id,
                'name' => $name,
                'category' => $category,
                'total_quote' => $quote,
                'advance_payment' => $quote * 0.2,
                'total_paid' => $quote * 0.3,
                'progress_start_date' => $project->start_date,
                'progress_end_date' => $project->end_date,
                'progress_status' => 'in_progress',
                'payment_status' => 'partial',
                'created_by' => $this->pm1->id,
                'approved_by' => $this->owner->id,
                'approved_at' => now()->subMonths(2),
            ]);
        }

        return $subcontractors;
    }

    // ====================================================================
    // 9. THANH TOÁN NTP (đa trạng thái)
    // ====================================================================

    private function seedSubPayments(Project $project, array $subcontractors): void
    {
        $statusFlow = [
            'pending_management_approval',
            'pending_accountant_confirmation',
            'paid',
        ];

        foreach ($subcontractors as $sub) {
            for ($i = 1; $i <= 3; $i++) {
                $status = $statusFlow[$i - 1];
                SubcontractorPayment::create([
                    'subcontractor_id' => $sub->id,
                    'project_id' => $project->id,
                    'payment_stage' => "Đợt {$i}",
                    'amount' => $sub->total_quote * 0.3,
                    'accepted_volume' => rand(50, 100),
                    'payment_date' => $status === 'paid' ? now()->subDays(rand(5, 30)) : null,
                    'payment_method' => ['bank_transfer', 'cash', 'bank_transfer'][$i - 1],
                    'description' => "Thanh toán đợt {$i} cho {$sub->name}",
                    'status' => $status,
                    'created_by' => $this->pm1->id,
                    'approved_by' => $status !== 'pending_management_approval' ? $this->owner->id : null,
                    'approved_at' => $status !== 'pending_management_approval' ? now()->subDays(rand(3, 15)) : null,
                    'paid_by' => $status === 'paid' ? $this->accountant->id : null,
                    'paid_at' => $status === 'paid' ? now()->subDays(rand(1, 10)) : null,
                ]);
            }
        }
    }

    // ====================================================================
    // 10. NGHIỆM THU NTP
    // ====================================================================

    private function seedSubAcceptances(Project $project, array $subcontractors): void
    {
        foreach ($subcontractors as $sub) {
            SubcontractorAcceptance::create([
                'subcontractor_id' => $sub->id,
                'project_id' => $project->id,
                'acceptance_name' => "Nghiệm thu {$sub->name} - Đợt 1",
                'description' => "Nghiệm thu khối lượng hoàn thành đợt 1",
                'acceptance_date' => now()->subDays(rand(5, 20)),
                'accepted_volume' => rand(30, 80),
                'volume_unit' => 'm²',
                'accepted_amount' => $sub->total_quote * 0.3,
                'quality_score' => rand(70, 100) / 10.0,
                'status' => 'pending',
                'created_by' => $this->supervisor1->id,
            ]);
        }
    }

    // ====================================================================
    // 11. NHÀ CUNG CẤP
    // ====================================================================

    private function seedSuppliers(): array
    {
        $suppliersData = [
            ['VLXD Sài Gòn', 'Vật liệu xây dựng', 'Nguyễn Văn A', '0901234567'],
            ['Thép Pomina Miền Nam', 'Thép xây dựng', 'Trần Thị B', '0912345678'],
            ['Bê tông Hòa Phát', 'Bê tông tươi', 'Lê Văn C', '0923456789'],
        ];

        $suppliers = [];
        foreach ($suppliersData as [$name, $category, $contact, $phone]) {
            $suppliers[] = Supplier::firstOrCreate(
                ['name' => $name],
                [
                    'name' => $name,
                    'category' => $category,
                    'contact_person' => $contact,
                    'phone' => $phone,
                    'email' => strtolower(Str::slug($name)) . '@supplier.vn',
                    'address' => 'TP. Hồ Chí Minh',
                    'tax_code' => '03' . rand(10000000, 99999999),
                    'status' => 'active',
                    'total_debt' => rand(100000000, 500000000),
                    'total_paid' => rand(50000000, 300000000),
                ]
            );
        }

        return $suppliers;
    }

    // ====================================================================
    // 12. VẬT TƯ (Materials)
    // ====================================================================

    private function seedMaterials(): array
    {
        $materialsData = [
            ['Xi măng Hà Tiên PCB40', 'XM-001', 'tấn', 'Vật liệu xây dựng', 2200000],
            ['Thép Pomina D10', 'TP-D10', 'tấn', 'Thép', 15800000],
            ['Cát xây dựng', 'CAT-01', 'm³', 'Vật liệu xây dựng', 350000],
            ['Gạch ốp lát 60x60', 'GOL-60', 'm²', 'Hoàn thiện', 185000],
            ['Ống nước Bình Minh D34', 'ON-D34', 'm', 'Cấp thoát nước', 45000],
            ['Dây điện Cadivi 2.5mm', 'DD-25', 'm', 'Điện', 12000],
            ['Sơn Jotun nội thất', 'SN-JT', 'thùng', 'Hoàn thiện', 650000],
            ['Đá 1x2', 'DA-12', 'm³', 'Vật liệu xây dựng', 420000],
        ];

        $materials = [];
        foreach ($materialsData as [$name, $code, $unit, $category, $price]) {
            $materials[] = \App\Models\Material::firstOrCreate(
                ['code' => $code],
                [
                    'name' => $name,
                    'code' => $code,
                    'unit' => $unit,
                    'category' => $category,
                    'unit_price' => $price,
                    'status' => 'active',
                ]
            );
        }

        return $materials;
    }

    // ====================================================================
    // 13. PHIẾU VẬT TƯ (MaterialBill)
    // ====================================================================

    private function seedMaterialBills(Project $project, array $suppliers, array $materials): void
    {
        $billsData = [
            ['pending_management', 'Xi măng, cát, đá', 85000000],
            ['pending_accountant', 'Thép xây dựng', 245000000],
            ['approved', 'Gạch ốp lát', 120000000],
            ['draft', 'Ống nước, phụ kiện', 35000000],
        ];

        foreach ($billsData as $i => [$status, $note, $amount]) {
            $supplier = $suppliers[array_rand($suppliers)];
            $bill = MaterialBill::create([
                'project_id' => $project->id,
                'supplier_id' => $supplier->id,
                'bill_date' => now()->subDays(rand(3, 30)),
                'total_amount' => $amount,
                'notes' => $note,
                'status' => $status,
                'created_by' => $this->pm1->id,
                'management_approved_by' => in_array($status, ['pending_accountant', 'approved']) ? $this->owner->id : null,
                'management_approved_at' => in_array($status, ['pending_accountant', 'approved']) ? now()->subDays(rand(2, 10)) : null,
                'accountant_approved_by' => $status === 'approved' ? $this->accountant->id : null,
                'accountant_approved_at' => $status === 'approved' ? now()->subDays(rand(1, 5)) : null,
            ]);

            // Tạo items cho bill
            for ($j = 0; $j < 3; $j++) {
                $material = $materials[array_rand($materials)];
                $qty = rand(10, 100);
                $price = $material->unit_price ?? rand(100000, 5000000);
                MaterialBillItem::create([
                    'material_bill_id' => $bill->id,
                    'material_id' => $material->id,
                    'quantity' => $qty,
                    'unit_price' => $price,
                    'total_price' => $qty * $price,
                    'notes' => $material->name,
                ]);
            }
        }
    }

    // ====================================================================
    // 13. NGHIỆM THU NCC
    // ====================================================================

    private function seedSupplierAcceptances(Project $project, array $suppliers): void
    {
        foreach ($suppliers as $supplier) {
            SupplierAcceptance::create([
                'supplier_id' => $supplier->id,
                'project_id' => $project->id,
                'acceptance_name' => "Nghiệm thu vật tư {$supplier->name}",
                'description' => "Kiểm tra chất lượng vật tư nhập kho",
                'acceptance_date' => now()->subDays(rand(3, 15)),
                'accepted_quantity' => rand(10, 100),
                'quantity_unit' => 'tấn',
                'accepted_amount' => rand(50000000, 200000000),
                'quality_score' => rand(70, 98) / 10.0,
                'status' => 'pending',
                'created_by' => $this->supervisor1->id,
            ]);
        }
    }

    // ====================================================================
    // 14. NGHIỆM THU KHÁCH HÀNG
    // ====================================================================

    private function seedAcceptanceStages(Project $project): void
    {
        $stages = [
            ['Nghiệm thu phần móng', 'supervisor_approved', 1],
            ['Nghiệm thu phần thân tầng 1', 'project_manager_approved', 2],
            ['Nghiệm thu phần thân tầng 2-3', 'pending', 3],
            ['Nghiệm thu hệ thống M&E', 'pending', 4],
            ['Nghiệm thu hoàn thiện & bàn giao', 'pending', 5],
        ];

        $tasks = ProjectTask::where('project_id', $project->id)->get();

        foreach ($stages as [$name, $status, $order]) {
            AcceptanceStage::create([
                'project_id' => $project->id,
                'task_id' => $tasks->isNotEmpty() ? $tasks->random()->id : null,
                'name' => $name,
                'description' => "Giai đoạn nghiệm thu: {$name}",
                'order' => $order,
                'status' => $status,
                'supervisor_approved_by' => in_array($status, ['supervisor_approved', 'project_manager_approved']) ? $this->supervisor1->id : null,
                'supervisor_approved_at' => in_array($status, ['supervisor_approved', 'project_manager_approved']) ? now()->subDays(rand(10, 30)) : null,
                'project_manager_approved_by' => $status === 'project_manager_approved' ? $this->pm1->id : null,
                'project_manager_approved_at' => $status === 'project_manager_approved' ? now()->subDays(rand(5, 15)) : null,
            ]);
        }
    }

    // ====================================================================
    // 15. NHẬT KÝ CÔNG TRƯỜNG
    // ====================================================================

    private function seedConstructionLogs(Project $project): void
    {
        $weathers = ['Nắng', 'Mưa nhẹ', 'Nắng gắt', 'Mây', 'Mưa to', 'Nắng nhẹ'];
        $tasks = ProjectTask::where('project_id', $project->id)->get();

        for ($i = 0; $i < 15; $i++) {
            $logDate = now()->subDays($i + 1);

            ConstructionLog::firstOrCreate(
                ['project_id' => $project->id, 'log_date' => $logDate->toDateString()],
                [
                    'project_id' => $project->id,
                    'task_id' => $tasks->isNotEmpty() ? $tasks->random()->id : null,
                    'log_date' => $logDate,
                    'weather' => $weathers[array_rand($weathers)],
                    'personnel_count' => rand(12, 45),
                    'completion_percentage' => rand(2, 8),
                    'notes' => "Nhật ký ngày {$logDate->format('d/m/Y')}: Thi công bình thường, " . rand(10, 40) .  " công nhân. " . $weathers[array_rand($weathers)] . '.',
                    'created_by' => $this->supervisor1->id,
                ]
            );
        }
    }

    // ====================================================================
    // 16. SAI SÓT (Defects)
    // ====================================================================

    private function seedDefects(Project $project): void
    {
        $defectsData = [
            ['Nứt tường tầng 1 - khu bếp', 'high', 'open'],
            ['Thấm trần nhà tắm tầng 2', 'critical', 'in_progress'],
            ['Sơn bong tróc cầu thang', 'medium', 'fixed'],
            ['Gạch ốp không đều - phòng khách', 'low', 'verified'],
            ['Ống nước rò rỉ - sân sau', 'high', 'in_progress'],
            ['Khe co giãn móng bị lệch', 'critical', 'open'],
            ['Điện lắp sai phase - tầng 3', 'high', 'fixed'],
        ];

        foreach ($defectsData as [$desc, $severity, $status]) {
            Defect::create([
                'project_id' => $project->id,
                'description' => $desc,
                'severity' => $severity,
                'status' => $status,
                'expected_completion_date' => now()->addDays(rand(3, 21)),
                'reported_by' => $this->supervisor1->id,
                'reported_at' => now()->subDays(rand(3, 20)),
                'fixed_by' => in_array($status, ['fixed', 'verified']) ? $this->supervisor2->id : null,
                'fixed_at' => in_array($status, ['fixed', 'verified']) ? now()->subDays(rand(1, 10)) : null,
                'verified_by' => $status === 'verified' ? $this->pm1->id : null,
                'verified_at' => $status === 'verified' ? now()->subDays(rand(1, 5)) : null,
            ]);
        }
    }

    // ====================================================================
    // 17. YÊU CẦU THAY ĐỔI
    // ====================================================================

    private function seedChangeRequests(Project $project): void
    {
        $items = [
            ['Thay đổi vật liệu sàn tầng 2 từ gạch sang gỗ', 'scope', 'high', 'submitted', 150000000],
            ['Điều chỉnh tiến độ hoàn thiện +15 ngày do mưa', 'schedule', 'medium', 'approved', 0],
            ['Bổ sung hệ thống smart home', 'scope', 'urgent', 'under_review', 280000000],
            ['Giảm chi phí sơn ngoại thất', 'cost', 'low', 'rejected', -35000000],
            ['Thêm phòng kho tầng hầm', 'scope', 'high', 'implemented', 420000000],
        ];

        foreach ($items as [$title, $type, $priority, $status, $costImpact]) {
            ChangeRequest::create([
                'project_id' => $project->id,
                'title' => $title,
                'description' => "Mô tả chi tiết: {$title}",
                'change_type' => $type,
                'priority' => $priority,
                'status' => $status,
                'reason' => "Theo yêu cầu khách hàng / điều kiện thực tế",
                'impact_analysis' => "Ảnh hưởng: chi phí " . ($costImpact > 0 ? '+' : '') . number_format($costImpact) . " VNĐ",
                'estimated_cost_impact' => abs($costImpact),
                'estimated_schedule_impact_days' => rand(0, 20),
                'requested_by' => $this->pm1->id,
                'reviewed_by' => in_array($status, ['under_review', 'approved', 'rejected', 'implemented']) ? $this->pm2->id : null,
                'approved_by' => in_array($status, ['approved', 'implemented']) ? $this->owner->id : null,
                'submitted_at' => in_array($status, ['submitted', 'under_review', 'approved', 'rejected', 'implemented']) ? now()->subDays(rand(5, 20)) : null,
                'reviewed_at' => in_array($status, ['under_review', 'approved', 'rejected']) ? now()->subDays(rand(3, 12)) : null,
                'approved_at' => in_array($status, ['approved', 'implemented']) ? now()->subDays(rand(2, 8)) : null,
                'implemented_at' => $status === 'implemented' ? now()->subDays(rand(1, 5)) : null,
                'rejection_reason' => $status === 'rejected' ? 'Không phù hợp ngân sách dự án hiện tại' : null,
            ]);
        }
    }

    // ====================================================================
    // 18. CHẤM CÔNG
    // ====================================================================

    private function seedAttendance(Project $project): void
    {
        $users = User::inRandomOrder()->limit(8)->get();
        $statuses = ['present', 'late', 'absent', 'half_day'];

        for ($day = 0; $day < 10; $day++) {
            $workDate = now()->subDays($day + 1);
            if ($workDate->isWeekend()) continue;

            foreach ($users->take(rand(4, 7)) as $user) {
                $pool = array_merge(
                    array_fill(0, 7, 'present'),
                    ['late', 'late', 'absent']
                );
                $status = $pool[array_rand($pool)];
                $checkIn = $workDate->copy()->setTime(rand(7, 8), rand(0, 59));
                $checkOut = $checkIn->copy()->addHours(rand(7, 10));

                Attendance::firstOrCreate(
                    ['user_id' => $user->id, 'work_date' => $workDate->toDateString()],
                    [
                        'user_id' => $user->id,
                        'project_id' => $project->id,
                        'work_date' => $workDate,
                        'check_in' => $checkIn->format('H:i:s'),
                        'check_out' => $checkOut->format('H:i:s'),
                        'hours_worked' => $checkIn->diffInHours($checkOut),
                        'overtime_hours' => max(0, $checkIn->diffInHours($checkOut) - 8),
                        'status' => $status,
                        'check_in_method' => ['gps', 'qr_code', 'manual'][array_rand(['gps', 'qr_code', 'manual'])],
                        'latitude' => 10.7769 + (rand(-100, 100) / 10000),
                        'longitude' => 106.7009 + (rand(-100, 100) / 10000),
                        'note' => $status === 'late' ? 'Kẹt xe đường Nguyễn Hữu Thọ' : null,
                    ]
                );
            }
        }
    }

    // ====================================================================
    // 19. NĂNG SUẤT LAO ĐỘNG
    // ====================================================================

    private function seedLaborProductivity(Project $project): void
    {
        $tasks = ProjectTask::where('project_id', $project->id)->inRandomOrder()->limit(5)->get();
        $workers = User::inRandomOrder()->limit(5)->get();

        $workItems = [
            ['Đổ bê tông sàn', 'm³', 10, 12],
            ['Xây tường gạch', 'm²', 30, 35],
            ['Ốp lát gạch', 'm²', 20, 18],
            ['Tô trát tường', 'm²', 25, 28],
            ['Lắp đặt ống nước', 'm', 40, 38],
        ];

        foreach ($workItems as $i => [$item, $unit, $planned, $actual]) {
            LaborProductivity::create([
                'project_id' => $project->id,
                'user_id' => $workers->count() > $i ? $workers[$i]->id : $workers->first()->id,
                'task_id' => $tasks->isNotEmpty() ? $tasks->random()->id : null,
                'record_date' => now()->subDays(rand(1, 15)),
                'work_item' => $item,
                'unit' => $unit,
                'planned_quantity' => $planned,
                'actual_quantity' => $actual,
                'workers_count' => rand(3, 8),
                'hours_spent' => rand(6, 10),
                'note' => $actual >= $planned ? 'Đạt năng suất' : 'Cần cải thiện',
                'created_by' => $this->supervisor1->id,
            ]);
        }
    }

    // ====================================================================
    // 20. NGÂN SÁCH DỰ ÁN
    // ====================================================================

    private function seedBudgets(Project $project, Contract $contract): void
    {
        $budgets = [
            ['Ngân sách phần móng', $contract->contract_value * 0.2, 'approved'],
            ['Ngân sách phần thân', $contract->contract_value * 0.35, 'approved'],
            ['Ngân sách hoàn thiện', $contract->contract_value * 0.3, 'draft'],
            ['Ngân sách ngoại thất', $contract->contract_value * 0.15, 'draft'],
        ];

        foreach ($budgets as [$name, $amount, $status]) {
            ProjectBudget::create([
                'project_id' => $project->id,
                'name' => $name,
                'total_budget' => $amount,
                'estimated_cost' => $amount * 0.95,
                'actual_cost' => $status === 'approved' ? $amount * (rand(85, 110) / 100) : 0,
                'remaining_budget' => $status === 'approved' ? $amount * 0.1 : $amount,
                'budget_date' => now()->subDays(rand(10, 60)),
                'status' => $status,
                'notes' => "Ngân sách dự kiến cho: {$name}",
                'created_by' => $this->pm1->id,
                'approved_by' => $status === 'approved' ? $this->owner->id : null,
                'approved_at' => $status === 'approved' ? now()->subDays(rand(5, 20)) : null,
            ]);
        }
    }

    // ====================================================================
    // 21. RỦI RO DỰ ÁN
    // ====================================================================

    private function seedRisks(Project $project): void
    {
        $risks = [
            ['Chậm giao vật liệu', 'schedule', 'high', 'high', 'identified'],
            ['Thiếu nhân công mùa mưa', 'resource', 'medium', 'medium', 'mitigated'],
            ['Thay đổi quy hoạch khu vực', 'scope', 'high', 'very_high', 'monitored'],
            ['Tăng giá thép đột ngột', 'cost', 'high', 'high', 'analyzed'],
            ['Tai nạn lao động', 'quality', 'low', 'very_high', 'identified'],
        ];

        foreach ($risks as [$title, $riskType, $probability, $impact, $status]) {
            ProjectRisk::create([
                'project_id' => $project->id,
                'title' => $title,
                'description' => "Rủi ro: {$title} - cần theo dõi thường xuyên",
                'category' => $riskType,
                'risk_type' => 'threat',
                'status' => $status,
                'probability' => $probability,
                'impact' => $impact,
                'mitigation_plan' => "Giải pháp: Phòng ngừa và chuẩn bị kế hoạch dự phòng",
                'contingency_plan' => "Kế hoạch dự phòng khi rủi ro xảy ra",
                'identified_by' => $this->pm1->id,
                'identified_date' => now()->subDays(rand(10, 30)),
                'target_resolution_date' => now()->addDays(rand(15, 60)),
            ]);
        }
    }

    // ====================================================================
    // 22. THIẾT BỊ & PHÂN BỔ
    // ====================================================================

    private function seedEquipment(array $projects): void
    {
        $equipmentList = [
            ['Xe cần trục Tadano 50T', 'Xe cẩu', 'available', 1],
            ['Máy xúc đào Komatsu PC200', 'Máy đào', 'in_use', 1],
            ['Máy trộn bê tông 350L', 'Máy trộn', 'in_use', 3],
            ['Xe ben Hyundai HD270', 'Xe tải', 'available', 2],
            ['Máy phát điện 100KVA', 'Máy phát', 'maintenance', 1],
            ['Giàn giáo thép', 'Phụ kiện', 'in_use', 50],
            ['Máy cắt sắt GQ40', 'Máy gia công', 'available', 2],
            ['Máy bơm bê tông Putzmeister', 'Máy bơm', 'in_use', 1],
        ];

        foreach ($equipmentList as [$name, $category, $status, $qty]) {
            $eq = Equipment::create([
                'name' => $name,
                'code' => 'EQ-' . strtoupper(Str::random(6)),
                'category' => $category,
                'type' => ['owned', 'rented'][array_rand(['owned', 'rented'])],
                'quantity' => $qty,
                'status' => $status,
                'notes' => "Thiết bị: {$name}",
            ]);

            // Phân bổ thiết bị đang sử dụng
            if ($status === 'in_use' && !empty($projects)) {
                $project = $projects[array_rand($projects)];
                EquipmentAllocation::create([
                    'equipment_id' => $eq->id,
                    'project_id' => $project->id,
                    'allocation_type' => 'rent',
                    'quantity' => min($qty, rand(1, $qty)),
                    'start_date' => $project->start_date ?? now()->subMonths(1),
                    'end_date' => $project->end_date,
                    'handover_date' => $project->start_date ?? now()->subMonths(1),
                    'status' => 'active',
                    'created_by' => $this->pm1->id,
                ]);
            }
        }
    }

    // ====================================================================
    // PRINT SUMMARY
    // ====================================================================

    private function printSummary(): void
    {
        $this->command->info('');
        $this->command->info('╔═══════════════════════════════════════════════════════╗');
        $this->command->info('║  ✅ SEEDING HOÀN TẤT — Tổng hợp dữ liệu:           ║');
        $this->command->info('╠═══════════════════════════════════════════════════════╣');

        $counts = [
            ['Dự án', Project::count()],
            ['Giai đoạn (Phases)', ProjectPhase::count()],
            ['Công việc (Tasks)', ProjectTask::count()],
            ['Hợp đồng', Contract::count()],
            ['Thanh toán DA', ProjectPayment::count()],
            ['Chi phí', Cost::count()],
            ['CP Phát sinh', AdditionalCost::count()],
            ['Nhà thầu phụ', Subcontractor::count()],
            ['Thanh toán NTP', SubcontractorPayment::count()],
            ['Nghiệm thu NTP', SubcontractorAcceptance::count()],
            ['Nhà cung cấp', Supplier::count()],
            ['Phiếu vật tư', MaterialBill::count()],
            ['Nghiệm thu NCC', SupplierAcceptance::count()],
            ['Nghiệm thu KH', AcceptanceStage::count()],
            ['Nhật ký CT', ConstructionLog::count()],
            ['Sai sót', Defect::count()],
            ['Yêu cầu thay đổi', ChangeRequest::count()],
            ['Chấm công', Attendance::count()],
            ['Năng suất LĐ', LaborProductivity::count()],
            ['Thiết bị', Equipment::count()],
            ['Ngân sách', ProjectBudget::count()],
            ['Rủi ro', ProjectRisk::count()],
        ];

        $total = 0;
        foreach ($counts as [$label, $count]) {
            $total += $count;
            $pad = str_pad($label, 22);
            $this->command->info("║  {$pad} {$count}");
        }

        $this->command->info('╠═══════════════════════════════════════════════════════╣');
        $this->command->info("║  TỔNG RECORDS: {$total}");
        $this->command->info('╚═══════════════════════════════════════════════════════╝');
        $this->command->info('');
        $this->command->info('🔐 Tài khoản test:');
        $this->command->info('   Super Admin:  superadmin.test@test.com / superadmin123');
        $this->command->info('   Admin:        admin1@test.com / admin123');
        $this->command->info('   Owner (BĐH):  projectowner1@test.com / owner123');
        $this->command->info('   PM:           pm1@test.com / pm123');
        $this->command->info('   Kế toán:      accountant1@test.com / accountant123');
        $this->command->info('   Giám sát:     supervisor1@test.com / supervisor123');
        $this->command->info('   Khách hàng:   client1@test.com / client123');
        $this->command->info('');
    }
}
