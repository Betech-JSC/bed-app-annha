<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$acceptance = App\Models\Acceptance::where('workflow_status', 'submitted')->first();
if (!$acceptance) {
    echo "No submitted acceptance found.\n";
    exit;
}

echo "Found acceptance ID: {$acceptance->id}, Status: {$acceptance->workflow_status}\n";

$service = app(App\Services\AcceptanceService::class);
$user = App\Models\User::find($acceptance->submitted_by);
if (!$user) {
    $user = App\Models\User::first();
}

$service->revertToDraft($acceptance, $user);

$acceptance->refresh();
echo "After revert, Status: {$acceptance->workflow_status}\n";

