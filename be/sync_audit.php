<?php

require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\Cost;
use App\Models\MaterialBill;
use App\Models\SubcontractorPayment;
use App\Models\EquipmentRental;
use App\Models\EquipmentPurchase;

echo "--- API TESTER: SYNC AUDIT REPORT ---\n\n";

// 1. Material Bills
$approvedBills = MaterialBill::where('status', 'approved')->get();
$billCount = $approvedBills->count();
$syncedBillCount = Cost::whereNotNull('material_bill_id')->count();
echo "Material Bills (Approved): " . $billCount . "\n";
echo "Costs linked to Material Bills: " . $syncedBillCount . "\n";
if ($billCount > $syncedBillCount) {
    echo "⚠️ MISSING: " . ($billCount - $syncedBillCount) . " material bills are NOT in costs.\n";
}

// 2. Subcontractor Payments
$paidSubPayments = SubcontractorPayment::where('status', 'paid')->get();
$subCount = $paidSubPayments->count();
$syncedSubCount = Cost::whereNotNull('subcontractor_payment_id')->count();
echo "\nSubcontractor Payments (Paid): " . $subCount . "\n";
echo "Costs linked to Sub Payments: " . $syncedSubCount . "\n";
if ($subCount > $syncedSubCount) {
    echo "⚠️ MISSING: " . ($subCount - $syncedSubCount) . " sub payments are NOT in costs.\n";
}

// 3. Equipment Rentals
$approvedRentals = EquipmentRental::where('status', 'approved')->get();
$rentalCount = $approvedRentals->count();
$syncedRentalCount = Cost::whereNotNull('equipment_rental_id')->count();
echo "\nEquipment Rentals (Approved): " . $rentalCount . "\n";
echo "Costs linked to Equipment Rentals: " . $syncedRentalCount . "\n";
if ($rentalCount > $syncedRentalCount) {
    echo "⚠️ MISSING: " . ($rentalCount - $syncedRentalCount) . " rentals are NOT in costs.\n";
}

// 4. Detailed Check for specific IDs
echo "\n--- DETAILED SYNC CHECK ---\n";
foreach ($approvedBills as $bill) {
    $costExists = Cost::where('material_bill_id', $bill->id)->exists();
    if (!$costExists) {
        echo "Pending Sync: Material Bill #{$bill->bill_number} (ID: {$bill->id})\n";
    }
}

foreach ($paidSubPayments as $p) {
    $costExists = Cost::where('subcontractor_payment_id', $p->id)->exists();
    if (!$costExists) {
        echo "Pending Sync: Sub Payment #{$p->payment_number} (ID: {$p->id})\n";
    }
}

echo "\n--- END OF REPORT ---\n";
