<?php

namespace App\Providers;

use Illuminate\Foundation\Support\Providers\RouteServiceProvider as ServiceProvider;
use Illuminate\Support\Facades\Route;

class RouteServiceProvider extends ServiceProvider
{
    /**
     * Các không gian tên (namespace) mà tất cả route của bạn sẽ sử dụng.
     *
     * @var string
     */
    protected $namespace = 'App\Http\Controllers';

    /**
     * Đăng ký tất cả các route cho ứng dụng của bạn.
     *
     * @return void
     */
    public function map()
    {
        $this->mapApiRoutes();   // Đảm bảo gọi hàm này để đăng ký các route API
        $this->mapWebRoutes();   // Đăng ký các route web nếu cần
    }

    /**
     * Đăng ký route API.
     *
     * @return void
     */
    protected function mapApiRoutes()
    {
        Route::prefix('api')               // Thêm prefix 'api' vào các route của API
            ->middleware('api')            // Sử dụng middleware 'api' (hoặc các middleware khác nếu cần)
            ->namespace($this->namespace)   // Chỉ định không gian tên cho controller
            ->group(base_path('routes/api.php'));  // Đường dẫn tới tệp chứa các route API
    }

    /**
     * Đăng ký route web.
     *
     * @return void
     */
    protected function mapWebRoutes()
    {
        Route::middleware('web')                    // Sử dụng middleware 'web'
            ->namespace($this->namespace)           // Chỉ định không gian tên cho controller
            ->group(base_path('routes/web.php'));   // Đường dẫn tới tệp chứa các route web
    }
}
