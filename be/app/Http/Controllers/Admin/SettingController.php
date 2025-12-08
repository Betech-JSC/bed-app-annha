<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Setting;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Request;
use Inertia\Inertia;
use Inertia\Response;

class SettingController extends Controller
{
    /**
     * Danh sách cấu hình
     */
    public function index(): Response
    {
        $settings = Setting::orderBy('key')->get()->groupBy(function ($setting) {
            // Nhóm theo prefix của key (vd: system_, payment_, etc.)
            $parts = explode('_', $setting->key);
            return $parts[0] ?? 'general';
        });

        return Inertia::render('Admin/Settings/Index', [
            'settings' => $settings,
        ]);
    }

    /**
     * Cập nhật cấu hình
     */
    public function update(): RedirectResponse
    {
        $settings = Request::get('settings', []);

        foreach ($settings as $key => $value) {
            Setting::updateOrCreate(
                ['key' => $key],
                ['value' => is_array($value) ? json_encode($value) : $value]
            );
        }

        return redirect()->back()->with('success', 'Đã cập nhật cấu hình thành công');
    }

    /**
     * Tạo cấu hình mới
     */
    public function store(): RedirectResponse
    {
        Request::validate([
            'key' => 'required|string|unique:settings,key',
            'value' => 'required',
            'type' => 'required|in:string,integer,float,boolean,json',
            'description' => 'sometimes|string|max:500',
        ]);

        Setting::create([
            'key' => Request::get('key'),
            'value' => is_array(Request::get('value')) ? json_encode(Request::get('value')) : Request::get('value'),
            'type' => Request::get('type'),
            'description' => Request::get('description'),
        ]);

        return redirect()->back()->with('success', 'Đã tạo cấu hình mới thành công');
    }

    /**
     * Xóa cấu hình
     */
    public function destroy($id): RedirectResponse
    {
        $setting = Setting::findOrFail($id);
        $setting->delete();

        return redirect()->back()->with('success', 'Đã xóa cấu hình thành công');
    }
}
