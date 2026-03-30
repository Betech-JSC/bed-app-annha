<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Cross-Origin Resource Sharing (CORS) Configuration
    |--------------------------------------------------------------------------
    |
    | Here you may configure your settings for cross-origin resource sharing
    | or "CORS". This determines what cross-origin operations may execute
    | in web browsers. You are free to adjust these settings as needed.
    |
    | To learn more: https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS
    |
    */

    'paths' => ['api/*'], // Đây là các đường dẫn sẽ áp dụng CORS. Bạn có thể thay đổi thành bất kỳ đường dẫn nào cần thiết.
    'allowed_methods' => ['*'], // Cho phép tất cả các phương thức HTTP như GET, POST, PUT, DELETE.
    'allowed_origins' => [
        'http://localhost:8000',
        'http://127.0.0.1:8000',
        'http://localhost:3000',
        'http://127.0.0.1:3000',
    ],
    'allowed_origins_patterns' => [],
    'allowed_headers' => ['*'], // Cho phép tất cả các headers.
    'exposed_headers' => [],
    'max_age' => 0,
    'supports_credentials' => true,
];
