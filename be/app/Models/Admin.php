<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class Admin extends Authenticatable
{
    use HasApiTokens, Notifiable;

    protected $fillable = [
        'first_name',
        'last_name',
        'email',
        'password',
        'image',
        'super_admin',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected $casts = [
        'super_admin' => 'boolean',
    ];

    /**
     * Get the admin's full name
     */
    public function getNameAttribute(): string
    {
        return trim($this->first_name . ' ' . $this->last_name);
    }

    /**
     * Get the admin's name (alias for compatibility)
     */
    public function getFullNameAttribute(): string
    {
        return $this->name;
    }

    /**
     * Roles của admin này
     */
    public function roles(): BelongsToMany
    {
        return $this->belongsToMany(Role::class, 'admin_role');
    }

    /**
     * Lấy tất cả permissions của admin này (thông qua roles)
     */
    public function getPermissionsAttribute()
    {
        return Permission::whereHas('roles', function ($query) {
            $query->whereHas('admins', function ($q) {
                $q->where('admins.id', $this->id);
            });
        })->get();
    }

    /**
     * Kiểm tra admin có permission không
     */
    public function hasPermission(string $permissionName): bool
    {
        // Super admin có tất cả quyền
        if ($this->super_admin) {
            return true;
        }

        return Permission::where('name', $permissionName)
            ->whereHas('roles', function ($query) {
                $query->whereHas('admins', function ($q) {
                    $q->where('admins.id', $this->id);
                });
            })
            ->exists();
    }

    /**
     * Kiểm tra admin có role không
     */
    public function hasRole(string $roleName): bool
    {
        return $this->roles()->where('name', $roleName)->exists();
    }
}
