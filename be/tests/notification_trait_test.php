<?php
/**
 * Comprehensive NotifiesUsers Trait Test Script
 * Test tất cả 5 models x tất cả events
 *
 * Chạy: php artisan tinker < tests/notification_trait_test.php
 */

use App\Models\{Cost, Defect, MaterialBill, ProjectPayment, AcceptanceStage};
use App\Models\{Project, User, Notification};
use Illuminate\Support\Facades\DB;

// ======================================================================
// SETUP
// ======================================================================
echo "\n";
echo "╔══════════════════════════════════════════════════════════════╗\n";
echo "║   🧪 NOTIFICATION TRAIT TEST SUITE                          ║\n";
echo "║   Testing: NotifiesUsers Trait across 5 Models              ║\n";
echo "╚══════════════════════════════════════════════════════════════╝\n\n";

$testResults = [];
$passed = 0;
$failed = 0;
$warnings = 0;

// Get a real project with PM
$project = Project::whereNotNull('project_manager_id')->first();
if (!$project) {
    echo "❌ FATAL: No project with PM found. Cannot test.\n";
    exit(1);
}

$testUser = User::first();
if (!$testUser) {
    echo "❌ FATAL: No user found. Cannot test.\n";
    exit(1);
}

echo "📋 Test Context:\n";
echo "   Project: #{$project->id} — {$project->name}\n";
echo "   PM ID: {$project->project_manager_id}\n";
echo "   Customer ID: " . ($project->customer_id ?? 'null') . "\n";
echo "   Actor: User #{$testUser->id} — {$testUser->name}\n";

// Count notifications before test
$notifCountBefore = Notification::count();
echo "   Notifications in DB (before): {$notifCountBefore}\n\n";

function testResult(string $name, bool $pass, string $detail = ''): void
{
    global $passed, $failed, $testResults;
    if ($pass) {
        $passed++;
        echo "  ✅ PASS: {$name}\n";
        if ($detail) echo "           {$detail}\n";
    } else {
        $failed++;
        echo "  ❌ FAIL: {$name}\n";
        if ($detail) echo "           {$detail}\n";
    }
    $testResults[] = ['name' => $name, 'pass' => $pass, 'detail' => $detail];
}

function testWarning(string $name, string $detail = ''): void
{
    global $warnings;
    $warnings++;
    echo "  ⚠️  WARN: {$name}\n";
    if ($detail) echo "           {$detail}\n";
}

// ======================================================================
// TEST 1: DB SCHEMA — Type column accepts long values
// ======================================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";
echo "📦 TEST GROUP 1: Database Schema Validation\n";
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";

try {
    $typeInfo = DB::select("SHOW COLUMNS FROM notifications WHERE Field = 'type'");
    $colType = $typeInfo[0]->Type ?? '???';
    testResult(
        'Type column is VARCHAR (not ENUM)',
        str_starts_with($colType, 'varchar'),
        "Actual type: {$colType}"
    );
} catch (\Exception $e) {
    testResult('Type column check', false, $e->getMessage());
}

// Test: Can insert a long custom type
try {
    $n = Notification::create([
        'user_id'  => $testUser->id,
        'type'     => 'material_bill_approved_accountant',
        'category' => 'workflow_approval',
        'title'    => 'DB Schema Test',
        'body'     => 'Testing long type values',
        'message'  => 'Testing long type values',
        'priority' => 'medium',
    ]);

    $freshN = Notification::find($n->id);
    $typeMatch = $freshN->type === 'material_bill_approved_accountant';
    testResult(
        'Long type value saved correctly (no truncation)',
        $typeMatch,
        "Saved: {$freshN->type}"
    );
    $n->delete();
} catch (\Exception $e) {
    testResult('Long type value insertion', false, $e->getMessage());
}

// ======================================================================
// TEST 2: Trait Method Existence on All Models
// ======================================================================
echo "\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";
echo "🔌 TEST GROUP 2: Trait Integration Check\n";
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";

$models = [
    Cost::class            => 'Cost',
    Defect::class          => 'Defect',
    MaterialBill::class    => 'MaterialBill',
    ProjectPayment::class  => 'ProjectPayment',
    AcceptanceStage::class => 'AcceptanceStage',
];

foreach ($models as $class => $label) {
    $instance = new $class();
    $hasNotify  = method_exists($instance, 'notifyEvent');
    $hasLabel   = method_exists($instance, 'getNotificationLabel');
    $hasProject = method_exists($instance, 'getNotificationProject');

    testResult(
        "{$label}::notifyEvent() exists",
        $hasNotify
    );
    testResult(
        "{$label}::getNotificationLabel() exists",
        $hasLabel
    );
    testResult(
        "{$label}::getNotificationProject() exists",
        $hasProject
    );
}

// ======================================================================
// TEST 3: Cost Model — Full Event Lifecycle
// ======================================================================
echo "\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";
echo "💰 TEST GROUP 3: Cost Notification Events\n";
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";

try {
    // Create a test cost
    $cost = Cost::create([
        'project_id' => $project->id,
        'name'       => 'TEST_NOTI_COST',
        'amount'     => 1000,
        'category'   => 'other',
        'cost_date'  => now(),
        'status'     => 'draft',
        'created_by' => $testUser->id,
    ]);

    echo "  📝 Created test Cost #{$cost->id}\n";

    // Test: getNotificationLabel
    $label = $cost->getNotificationLabel();
    testResult('Cost::getNotificationLabel()', !empty($label), "Label: \"{$label}\"");

    // Test: getNotificationProject
    $costProject = $cost->getNotificationProject();
    testResult('Cost::getNotificationProject()', $costProject !== null && $costProject->id === $project->id);

    // Test each event
    $costEvents = ['submitted', 'approved_management', 'approved_accountant', 'rejected'];
    foreach ($costEvents as $event) {
        $before = Notification::count();
        try {
            $extraData = $event === 'rejected' ? ['reason' => 'Test rejection'] : [];
            $cost->notifyEvent($event, $testUser, $extraData);
            $after = Notification::count();
            $created = $after - $before;

            if ($created > 0) {
                // Verify notification content
                $lastNotif = Notification::latest()->first();
                $typeCorrect = str_contains($lastNotif->type, $event);
                $tabCorrect  = str_contains($lastNotif->action_url ?? '', 'tab=costs');
                $bodyFilled  = !empty($lastNotif->body) && !str_contains($lastNotif->body, '{name}');

                testResult(
                    "Cost::notifyEvent('{$event}')",
                    $typeCorrect && $tabCorrect && $bodyFilled,
                    "Created: {$created} | Type: {$lastNotif->type} | URL: {$lastNotif->action_url} | Body: " . mb_substr($lastNotif->body, 0, 50)
                );
            } else {
                // May be 0 if actor is excluded and is the only target
                testWarning("Cost::notifyEvent('{$event}')", "0 notifications created (actor excluded or no targets)");
            }
        } catch (\Exception $e) {
            testResult("Cost::notifyEvent('{$event}')", false, "Exception: " . $e->getMessage());
        }
    }

    // Test invalid event
    $before = Notification::count();
    $cost->notifyEvent('invalid_event_xyz');
    $after = Notification::count();
    testResult('Cost: Invalid event handled gracefully', $after === $before, "No notifications created for invalid event");

    // Cleanup
    $cost->forceDelete();
    echo "  🧹 Cleaned up test Cost\n";
} catch (\Exception $e) {
    testResult('Cost lifecycle test', false, "Fatal: " . $e->getMessage());
}

// ======================================================================
// TEST 4: Defect Model — Full Event Lifecycle
// ======================================================================
echo "\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";
echo "🐛 TEST GROUP 4: Defect Notification Events\n";
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";

try {
    $defect = Defect::create([
        'project_id'  => $project->id,
        'description' => 'TEST_NOTI_DEFECT — Lỗi test thông báo',
        'severity'    => 'medium',
        'status'      => 'open',
        'reported_by' => $testUser->id,
    ]);
    echo "  📝 Created test Defect #{$defect->id}\n";

    $label = $defect->getNotificationLabel();
    testResult('Defect::getNotificationLabel()', !empty($label), "Label: \"{$label}\"");

    $defectEvents = ['in_progress', 'fixed', 'verified', 'rejected'];
    foreach ($defectEvents as $event) {
        $before = Notification::count();
        try {
            $extra = $event === 'rejected' ? ['reason' => 'Test rejection'] : [];
            $defect->notifyEvent($event, $testUser, $extra);
            $after = Notification::count();
            $created = $after - $before;

            if ($created > 0) {
                $lastNotif = Notification::latest()->first();
                $typeCorrect = str_contains($lastNotif->type, $event);
                $tabCorrect  = str_contains($lastNotif->action_url ?? '', 'tab=monitoring');

                testResult(
                    "Defect::notifyEvent('{$event}')",
                    $typeCorrect && $tabCorrect,
                    "Created: {$created} | Type: {$lastNotif->type} | URL: {$lastNotif->action_url}"
                );
            } else {
                testWarning("Defect::notifyEvent('{$event}')", "0 notifications (actor excluded or no targets)");
            }
        } catch (\Exception $e) {
            testResult("Defect::notifyEvent('{$event}')", false, "Exception: " . $e->getMessage());
        }
    }

    $defect->forceDelete();
    echo "  🧹 Cleaned up test Defect\n";
} catch (\Exception $e) {
    testResult('Defect lifecycle test', false, "Fatal: " . $e->getMessage());
}

// ======================================================================
// TEST 5: MaterialBill Model
// ======================================================================
echo "\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";
echo "📦 TEST GROUP 5: MaterialBill Notification Events\n";
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";

try {
    $bill = MaterialBill::create([
        'project_id'   => $project->id,
        'bill_number'  => 'TEST-NOTI-001',
        'bill_date'    => now(),
        'total_amount' => 5000,
        'status'       => 'draft',
        'created_by'   => $testUser->id,
    ]);
    echo "  📝 Created test MaterialBill #{$bill->id}\n";

    $label = $bill->getNotificationLabel();
    testResult('MaterialBill::getNotificationLabel()', !empty($label), "Label: \"{$label}\"");

    $billEvents = ['submitted', 'approved_management', 'approved_accountant', 'rejected'];
    foreach ($billEvents as $event) {
        $before = Notification::count();
        try {
            $extra = $event === 'rejected' ? ['reason' => 'Chi phí vượt budget'] : [];
            $bill->notifyEvent($event, $testUser, $extra);
            $after = Notification::count();
            $created = $after - $before;

            if ($created > 0) {
                $lastNotif = Notification::latest()->first();
                $typeCorrect = str_contains($lastNotif->type, $event);
                $tabCorrect  = str_contains($lastNotif->action_url ?? '', 'tab=materials');

                testResult(
                    "MaterialBill::notifyEvent('{$event}')",
                    $typeCorrect && $tabCorrect,
                    "Created: {$created} | Type: {$lastNotif->type} | URL: {$lastNotif->action_url}"
                );
            } else {
                testWarning("MaterialBill::notifyEvent('{$event}')", "0 notifications (actor excluded or no targets)");
            }
        } catch (\Exception $e) {
            testResult("MaterialBill::notifyEvent('{$event}')", false, "Exception: " . $e->getMessage());
        }
    }

    $bill->forceDelete();
    echo "  🧹 Cleaned up test MaterialBill\n";
} catch (\Exception $e) {
    testResult('MaterialBill lifecycle test', false, "Fatal: " . $e->getMessage());
}

// ======================================================================
// TEST 6: ProjectPayment Model
// ======================================================================
echo "\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";
echo "💳 TEST GROUP 6: ProjectPayment Notification Events\n";
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";

try {
    $payment = ProjectPayment::create([
        'project_id'     => $project->id,
        'payment_number' => 99,
        'amount'         => 100000,
        'status'         => 'pending',
        'due_date'       => now()->addDays(30),
    ]);
    echo "  📝 Created test ProjectPayment #{$payment->id}\n";

    $label = $payment->getNotificationLabel();
    testResult('ProjectPayment::getNotificationLabel()', !empty($label), "Label: \"{$label}\"");

    $paymentEvents = ['proof_uploaded', 'customer_approved', 'customer_rejected', 'confirmed', 'customer_paid'];
    foreach ($paymentEvents as $event) {
        $before = Notification::count();
        try {
            $extra = $event === 'customer_rejected' ? ['reason' => 'Sai thông tin'] : [];
            $payment->notifyEvent($event, $testUser, $extra);
            $after = Notification::count();
            $created = $after - $before;

            if ($created > 0) {
                $lastNotif = Notification::latest()->first();
                $typeCorrect = str_contains($lastNotif->type, $event);
                $tabCorrect  = str_contains($lastNotif->action_url ?? '', 'tab=payments');

                testResult(
                    "ProjectPayment::notifyEvent('{$event}')",
                    $typeCorrect && $tabCorrect,
                    "Created: {$created} | Type: {$lastNotif->type} | URL: {$lastNotif->action_url}"
                );
            } else {
                testWarning("ProjectPayment::notifyEvent('{$event}')", "0 notifications (actor excluded or no targets)");
            }
        } catch (\Exception $e) {
            testResult("ProjectPayment::notifyEvent('{$event}')", false, "Exception: " . $e->getMessage());
        }
    }

    $payment->forceDelete();
    echo "  🧹 Cleaned up test ProjectPayment\n";
} catch (\Exception $e) {
    testResult('ProjectPayment lifecycle test', false, "Fatal: " . $e->getMessage());
}

// ======================================================================
// TEST 7: AcceptanceStage Model
// ======================================================================
echo "\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";
echo "✅ TEST GROUP 7: AcceptanceStage Notification Events\n";
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";

try {
    $stage = AcceptanceStage::create([
        'project_id' => $project->id,
        'name'       => 'TEST_NOTI_STAGE',
        'status'     => 'pending',
        'order'      => 999,
    ]);
    echo "  📝 Created test AcceptanceStage #{$stage->id}\n";

    $label = $stage->getNotificationLabel();
    testResult('AcceptanceStage::getNotificationLabel()', !empty($label), "Label: \"{$label}\"");

    $stageEvents = ['submitted', 'supervisor_approved', 'pm_approved', 'customer_approved', 'rejected'];
    foreach ($stageEvents as $event) {
        $before = Notification::count();
        try {
            $extra = $event === 'rejected' ? ['reason' => 'Chất lượng chưa đạt'] : [];
            $stage->notifyEvent($event, $testUser, $extra);
            $after = Notification::count();
            $created = $after - $before;

            if ($created > 0) {
                $lastNotif = Notification::latest()->first();
                $typeCorrect = str_contains($lastNotif->type, $event);
                $tabCorrect  = str_contains($lastNotif->action_url ?? '', 'tab=acceptance');

                testResult(
                    "AcceptanceStage::notifyEvent('{$event}')",
                    $typeCorrect && $tabCorrect,
                    "Created: {$created} | Type: {$lastNotif->type} | URL: {$lastNotif->action_url}"
                );
            } else {
                testWarning("AcceptanceStage::notifyEvent('{$event}')", "0 notifications (actor excluded or no targets)");
            }
        } catch (\Exception $e) {
            testResult("AcceptanceStage::notifyEvent('{$event}')", false, "Exception: " . $e->getMessage());
        }
    }

    $stage->forceDelete();
    echo "  🧹 Cleaned up test AcceptanceStage\n";
} catch (\Exception $e) {
    testResult('AcceptanceStage lifecycle test', false, "Fatal: " . $e->getMessage());
}

// ======================================================================
// TEST 8: Edge Cases & Data Integrity
// ======================================================================
echo "\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";
echo "🔒 TEST GROUP 8: Edge Cases & Data Integrity\n";
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";

// Test: Actor with null (no actor)
try {
    $cost = Cost::create([
        'project_id' => $project->id,
        'name'       => 'TEST_NULL_ACTOR',
        'amount'     => 500,
        'category'   => 'other',
        'cost_date'  => now(),
        'status'     => 'draft',
        'created_by' => $testUser->id,
    ]);

    $before = Notification::count();
    $cost->notifyEvent('submitted', null);
    $after = Notification::count();
    testResult('Null actor handled gracefully', $after >= $before, "Created: " . ($after - $before));
    $cost->forceDelete();
} catch (\Exception $e) {
    testResult('Null actor test', false, $e->getMessage());
}

// Test: Body template variable replacement
try {
    $cost = Cost::create([
        'project_id' => $project->id,
        'name'       => 'Test Chi Phí ABC',
        'amount'     => 500,
        'category'   => 'other',
        'cost_date'  => now(),
        'status'     => 'draft',
        'created_by' => $testUser->id,
    ]);

    // Use a different user as target so notifications are created
    $otherUser = User::where('id', '!=', $testUser->id)->first();
    if ($otherUser) {
        $cost->notifyEvent('rejected', $otherUser, ['reason' => 'Vượt hạn mức']);
        $lastNotif = Notification::latest()->first();
        
        $noRawPlaceholders = !str_contains($lastNotif->body, '{name}') 
                          && !str_contains($lastNotif->body, '{reason}');
        $hasActualValues   = str_contains($lastNotif->body, 'Test Chi Phí ABC') 
                          && str_contains($lastNotif->body, 'Vượt hạn mức');

        testResult(
            'Body template variables replaced correctly',
            $noRawPlaceholders && $hasActualValues,
            "Body: {$lastNotif->body}"
        );
    } else {
        testWarning('Body template test', 'Only 1 user exists, skipped');
    }
    $cost->forceDelete();
} catch (\Exception $e) {
    testResult('Body template replacement', false, $e->getMessage());
}

// Test: action_url deep link format
try {
    $latestNotif = Notification::where('type', 'LIKE', 'cost_%')->latest()->first();
    if ($latestNotif && $latestNotif->action_url) {
        $hasProjectId = preg_match('/\/projects\/\d+/', $latestNotif->action_url);
        $hasTab       = str_contains($latestNotif->action_url, '?tab=');
        testResult(
            'action_url deep link format correct',
            $hasProjectId && $hasTab,
            "URL: {$latestNotif->action_url}"
        );
    } else {
        testWarning('action_url test', 'No cost notification found to verify');
    }
} catch (\Exception $e) {
    testResult('action_url format', false, $e->getMessage());
}

// Test: Notification data payload structure
try {
    $latestNotif = Notification::whereNotNull('data')->latest()->first();
    if ($latestNotif) {
        $data = $latestNotif->data;
        $hasProjectId  = isset($data['project_id']);
        $hasEntityType = isset($data['entity_type']);
        $hasEntityId   = isset($data['entity_id']);
        $hasEvent      = isset($data['event']);
        $hasSource     = isset($data['source']) && $data['source'] === 'crm';

        testResult(
            'Notification data payload structure correct',
            $hasProjectId && $hasEntityType && $hasEntityId && $hasEvent && $hasSource,
            "Keys: " . implode(', ', array_keys($data))
        );
    } else {
        testWarning('Data payload test', 'No notification with data found');
    }
} catch (\Exception $e) {
    testResult('Data payload structure', false, $e->getMessage());
}

// ======================================================================
// TEST 9: Notification Type Prefix Generation
// ======================================================================
echo "\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";
echo "🏷️  TEST GROUP 9: Type Prefix Convention\n";
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";

$expectedPrefixes = [
    Cost::class            => 'cost',
    Defect::class          => 'defect',
    MaterialBill::class    => 'material_bill',
    ProjectPayment::class  => 'project_payment',
    AcceptanceStage::class => 'acceptance_stage',
];

foreach ($expectedPrefixes as $class => $expectedPrefix) {
    $instance = new $class();
    // Use reflection to access protected method
    $reflection = new ReflectionMethod($class, 'getNotificationTypePrefix');
    $reflection->setAccessible(true);
    $actualPrefix = $reflection->invoke($instance);

    testResult(
        "Type prefix: {$class}",
        $actualPrefix === $expectedPrefix,
        "Expected: {$expectedPrefix} | Actual: {$actualPrefix}"
    );
}

// ======================================================================
// TEST 10: Real CRM Controller Integration (using existing data)
// ======================================================================
echo "\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";
echo "🔗 TEST GROUP 10: Real Data Integration\n";
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";

// Test with real existing Cost
$realCost = Cost::whereNotNull('project_id')->first();
if ($realCost) {
    try {
        $costProject = $realCost->getNotificationProject();
        testResult(
            'Real Cost->getNotificationProject()',
            $costProject !== null,
            "Project: " . ($costProject ? "#{$costProject->id} — {$costProject->name}" : "null")
        );
        testResult(
            'Real Cost->getNotificationLabel()',
            !empty($realCost->getNotificationLabel()),
            "Label: {$realCost->getNotificationLabel()}"
        );
    } catch (\Exception $e) {
        testResult('Real Cost integration', false, $e->getMessage());
    }
} else {
    testWarning('Real Cost', 'No Cost records found in DB');
}

// Test with real existing Defect
$realDefect = Defect::whereNotNull('project_id')->first();
if ($realDefect) {
    try {
        $defProject = $realDefect->getNotificationProject();
        testResult(
            'Real Defect->getNotificationProject()',
            $defProject !== null,
            "Project: " . ($defProject ? "#{$defProject->id}" : "null")
        );
    } catch (\Exception $e) {
        testResult('Real Defect integration', false, $e->getMessage());
    }
} else {
    testWarning('Real Defect', 'No Defect records found in DB');
}

// Test with real existing AcceptanceStage
$realStage = AcceptanceStage::whereNotNull('project_id')->first();
if ($realStage) {
    try {
        $stgProject = $realStage->getNotificationProject();
        testResult(
            'Real AcceptanceStage->getNotificationProject()',
            $stgProject !== null,
            "Project: " . ($stgProject ? "#{$stgProject->id}" : "null")
        );
    } catch (\Exception $e) {
        testResult('Real AcceptanceStage integration', false, $e->getMessage());
    }
} else {
    testWarning('Real AcceptanceStage', 'No AcceptanceStage records found in DB');
}

// ======================================================================
// CLEANUP — Remove test notifications
// ======================================================================
echo "\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";
echo "🧹 CLEANUP\n";
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";

$testNotifications = Notification::where('title', 'LIKE', '%TEST%')
    ->orWhere('body', 'LIKE', '%TEST_NOTI%')
    ->orWhere('title', 'DB Schema Test');
$cleanedCount = $testNotifications->count();
$testNotifications->delete();

// Also clean up notifications created during tests
$notifCountAfter = Notification::count();
$createdDuringTest = $notifCountAfter - $notifCountBefore;
echo "  Cleaned: {$cleanedCount} test notifications\n";
echo "  Net new notifications in DB: {$createdDuringTest}\n";

// ======================================================================
// SUMMARY
// ======================================================================
echo "\n╔══════════════════════════════════════════════════════════════╗\n";
echo "║   📊 TEST RESULTS SUMMARY                                   ║\n";
echo "╠══════════════════════════════════════════════════════════════╣\n";
$total = $passed + $failed;
echo "║   ✅ Passed:   {$passed}                                      \n";
echo "║   ❌ Failed:   {$failed}                                      \n";
echo "║   ⚠️  Warnings: {$warnings}                                    \n";
echo "║   📋 Total:    {$total}                                       \n";
echo "║                                                              ║\n";
$status = $failed === 0 ? '🟢 ALL TESTS PASSED' : '🔴 SOME TESTS FAILED';
echo "║   Status: {$status}                           \n";
echo "╚══════════════════════════════════════════════════════════════╝\n\n";
