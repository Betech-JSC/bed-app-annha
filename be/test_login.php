<?php

use App\Models\User;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;

require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';

$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

$email = 'admin_full@betech.com';
$password = 'Betech@2026';

echo "Testing login for $email...\n";

$user = User::where('email', $email)->first();

if (!$user) {
    echo "FAILED: User not found.\n";
    exit(1);
}

if (!Hash::check($password, $user->password)) {
    echo "FAILED: Password incorrect.\n";
    exit(1);
}

// Check access logic similar to AuthController
$hasAccess = $user->roles()->exists()
    || $user->hasPermission('settings.manage')
    || $user->role === 'admin'
    || $user->role === 'super_admin';

if ($hasAccess) {
    echo "SUCCESS: User authenticated and has CRM access.\n";
    echo "Role: " . $user->role . "\n";
} else {
    echo "FAILED: Authentication successful but NO CRM access.\n";
}
