<?php

// Test new Warranty API endpoints
$baseUrl = 'http://localhost:8000/api';
$email = 'admin_full@betech.com';
$password = 'Betech@2026';

echo "--- Testing Warranty API ---\n";

// 1. Login
echo "Logging in...\n";
$loginResponse = file_get_contents("$baseUrl/login", false, stream_context_create([
    'http' => [
        'method' => 'POST',
        'header' => 'Content-Type: application/json',
        'content' => json_encode(['email' => $email, 'password' => $password]),
    ]
]));
$loginData = json_decode($loginResponse, true);
$token = $loginData['data']['token'] ?? null;

if (!$token) {
    die("Login failed!\n");
}
echo "Login success. Token: " . substr($token, 0, 10) . "...\n";

// 2. Get a project ID
echo "Fetching projects...\n";
$projectsResponse = file_get_contents("$baseUrl/projects", false, stream_context_create([
    'http' => [
        'header' => "Authorization: Bearer $token",
    ]
]));
$projectsData = json_decode($projectsResponse, true);
$projectId = $projectsData['data'][0]['id'] ?? null;

if (!$projectId) {
    die("No projects found!\n");
}
echo "Using Project ID: $projectId\n";

// 3. Create a Warranty
echo "Creating warranty...\n";
$warrantyData = [
    'handover_date' => date('Y-m-d'),
    'warranty_content' => 'Test Warranty Content from Script',
    'warranty_start_date' => date('Y-m-d'),
    'warranty_end_date' => date('Y-m-d', strtotime('+1 year')),
    'notes' => 'Test Notes',
];

$createWarrantyResponse = file_get_contents("$baseUrl/projects/$projectId/warranties", false, stream_context_create([
    'http' => [
        'method' => 'POST',
        'header' => "Content-Type: application/json\r\nAuthorization: Bearer $token",
        'content' => json_encode($warrantyData),
    ]
]));
$createWarrantyResult = json_decode($createWarrantyResponse, true);
$warrantyUuid = $createWarrantyResult['data']['uuid'] ?? null;

if ($warrantyUuid) {
    echo "Warranty created. UUID: $warrantyUuid\n";
} else {
    echo "Create warranty FAILED: " . json_encode($createWarrantyResult) . "\n";
}

// 4. Create a Maintenance
echo "Creating maintenance...\n";
$maintenanceData = [
    'maintenance_date' => date('Y-m-d'),
    'notes' => 'Test Maintenance Notes',
];

$createMaintenanceResponse = file_get_contents("$baseUrl/projects/$projectId/maintenances", false, stream_context_create([
    'http' => [
        'method' => 'POST',
        'header' => "Content-Type: application/json\r\nAuthorization: Bearer $token",
        'content' => json_encode($maintenanceData),
    ]
]));
$createMaintenanceResult = json_decode($createMaintenanceResponse, true);
$maintenanceUuid = $createMaintenanceResult['data']['uuid'] ?? null;

if ($maintenanceUuid) {
    echo "Maintenance created. UUID: $maintenanceUuid\n";
} else {
    echo "Create maintenance FAILED: " . json_encode($createMaintenanceResult) . "\n";
}

// 5. Delete Warranty
if ($warrantyUuid) {
    echo "Deleting warranty...\n";
    $deleteWarrantyResponse = file_get_contents("$baseUrl/projects/$projectId/warranties/$warrantyUuid", false, stream_context_create([
        'http' => [
            'method' => 'DELETE',
            'header' => "Authorization: Bearer $token",
        ]
    ]));
    echo "Delete warranty Result: $deleteWarrantyResponse\n";
}

// 6. Delete Maintenance
if ($maintenanceUuid) {
    echo "Deleting maintenance...\n";
    $deleteMaintenanceResponse = file_get_contents("$baseUrl/projects/$projectId/maintenances/$maintenanceUuid", false, stream_context_create([
        'http' => [
            'method' => 'DELETE',
            'header' => "Authorization: Bearer $token",
        ]
    ]));
    echo "Delete maintenance Result: $deleteMaintenanceResponse\n";
}

echo "--- Test Completed ---\n";
