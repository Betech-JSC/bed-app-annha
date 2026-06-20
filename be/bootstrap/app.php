<?php

use App\Providers\AppServiceProvider;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withProviders()
    ->withRouting(
        web: __DIR__ . '/../routes/web.php',
        api: __DIR__ . '/../routes/api.php',
        commands: __DIR__ . '/../routes/console.php',
        channels: __DIR__ . '/../routes/channels.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware) {
        $middleware->redirectGuestsTo(fn() => route('login'));
        $middleware->redirectUsersTo(AppServiceProvider::HOME);

        $middleware->web([
            \App\Http\Middleware\HandleInertiaRequests::class,
            \App\Http\Middleware\SetLocale::class,
        ]);
        $middleware->api([
            \App\Http\Middleware\SetLocale::class,
        ]);
        $middleware->statefulApi();
        $middleware->throttleApi();

        $middleware->replace(\Illuminate\Http\Middleware\TrustProxies::class, \App\Http\Middleware\TrustProxies::class);

        // Register project access middleware
        $middleware->alias([
            'project.access' => \App\Http\Middleware\CheckProjectAccess::class,
            'permission' => \App\Http\Middleware\CheckPermission::class,
            'check.permission' => \App\Http\Middleware\CheckPermission::class,
            'admin' => \App\Http\Middleware\EnsureAdminIsAuthenticated::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions) {
        $exceptions->render(function (\Illuminate\Database\QueryException $e, \Illuminate\Http\Request $request) {
            if ($request->is('api/*') || $request->expectsJson()) {
                $message = 'Đã xảy ra lỗi cơ sở dữ liệu. Vui lòng kiểm tra lại.';
                $sqlState = $e->errorInfo[0] ?? null;
                $sqlError = $e->errorInfo[1] ?? null;
                
                if ($sqlState === '23000') {
                    if ($sqlError === 1048) {
                        preg_match("/Column '([^']+)' cannot be null/", $e->getMessage(), $matches);
                        $column = $matches[1] ?? 'trường bắt buộc';
                        $message = "Trường dữ liệu '{$column}' không được để trống.";
                    } elseif ($sqlError === 1451 || $sqlError === 1452) {
                        $message = 'Dữ liệu liên kết không hợp lệ hoặc đang được sử dụng ở nơi khác.';
                    } elseif ($sqlError === 1062) {
                        $message = 'Dữ liệu này đã tồn tại trong hệ thống (bị trùng lặp).';
                    }
                }
                
                return response()->json([
                    'success' => false,
                    'message' => $message,
                    'debug' => config('app.debug') ? $e->getMessage() : null
                ], 400);
            }
        });
    })->create();
