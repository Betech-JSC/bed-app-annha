<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Default Broadcaster
    |--------------------------------------------------------------------------
    |
    | Driver mặc định để broadcast sự kiện. 
    | Chúng ta dùng Reverb nên để là 'pusher'.
    |
    */

    'default' => env('BROADCAST_DRIVER', 'null'),

    /*
    |--------------------------------------------------------------------------
    | Broadcast Connections
    |--------------------------------------------------------------------------
    |
    | Cấu hình các kết nối broadcast.
    | Với Reverb, ta dùng driver 'pusher' nhưng key/secret/app_id lấy từ REVERB_*.
    |
    */

    'connections' => [

        'pusher' => [
            'driver' => 'pusher',
            'key'    => env('REVERB_APP_KEY'),
            'secret' => env('REVERB_APP_SECRET'),
            'app_id' => env('REVERB_APP_ID'),
            'options' => [
                'host'   => env('REVERB_HOST', '127.0.0.1'),
                'port'   => env('REVERB_PORT', 9000),
                'scheme' => env('REVERB_SCHEME', 'http'),
                'useTLS' => false,
            ],
        ],

        // Có thể giữ các connection khác nếu muốn:
        'log' => [
            'driver' => 'log',
        ],

        'null' => [
            'driver' => 'null',
        ],

    ],

];
