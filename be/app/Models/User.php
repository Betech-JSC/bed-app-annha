<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable, SoftDeletes;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'name',
        'email',
        'phone',
        'password',
        'fcm_token',
        'avatar',
        'first_name',
        'last_name',
        'role',
        'provider',
        'provider_id',
        'kyc_status',
        'kyc_documents',
        'kyc_submitted_at',
        'kyc_verified_at',
        'kyc_verified_by',
        'kyc_rejection_reason',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var array<int, string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'owner' => 'boolean',
            'email_verified_at' => 'datetime',
            'kyc_documents' => 'array',
            'kyc_submitted_at' => 'datetime',
            'kyc_verified_at' => 'datetime',
        ];
    }

    public function resolveRouteBinding($value, $field = null)
    {
        return $this->where($field ?? 'id', $value)->withTrashed()->firstOrFail();
    }

    public function account(): BelongsTo
    {
        return $this->belongsTo(Account::class);
    }

    public function setPasswordAttribute($password)
    {
        $this->attributes['password'] = Hash::needsRehash($password) ? Hash::make($password) : $password;
    }

    public function isDemoUser()
    {
        return $this->email === 'johndoe@example.com';
    }

    public function scopeOrderByName($query)
    {
        $query->orderBy('last_name')->orderBy('first_name');
    }

    public function scopeWhereRole($query, $role)
    {
        switch ($role) {
            case 'user':
                return $query->where('owner', false);
            case 'owner':
                return $query->where('owner', true);
        }
    }

    public function scopeFilter($query, array $filters)
    {
        $query->when($filters['search'] ?? null, function ($query, $search) {
            $query->where(function ($query) use ($search) {
                $query->where('first_name', 'like', '%' . $search . '%')
                    ->orWhere('last_name', 'like', '%' . $search . '%')
                    ->orWhere('email', 'like', '%' . $search . '%');
            });
        })->when($filters['role'] ?? null, function ($query, $role) {
            $query->whereRole($role);
        })->when($filters['trashed'] ?? null, function ($query, $trashed) {
            if ($trashed === 'with') {
                $query->withTrashed();
            } elseif ($trashed === 'only') {
                $query->onlyTrashed();
            }
        });
    }

    public function wallet()
    {
        return $this->hasOne(Wallet::class);
    }

    public function transactions()
    {
        return $this->hasMany(Transaction::class);
    }

    /**
     * Roles của user (thông qua role_user pivot table)
     */
    public function roles()
    {
        return $this->belongsToMany(Role::class, 'role_user');
    }

    /**
     * Project personnel records của user
     */
    public function personnel(): HasMany
    {
        return $this->hasMany(ProjectPersonnel::class, 'user_id');
    }

    /**
     * Employee profile của user
     */
    public function employeeProfile()
    {
        return $this->hasOne(EmployeeProfile::class);
    }

    /**
     * Permissions trực tiếp của user (qua permission_user table)
     */
    public function directPermissions(): BelongsToMany
    {
        return $this->belongsToMany(Permission::class, 'permission_user');
    }

    /**
     * Permissions của user (thông qua roles + trực tiếp)
     */
    public function permissions()
    {
        $rolePermissions = $this->roles()->with('permissions')->get()->pluck('permissions')->flatten();
        $directPermissions = $this->directPermissions()->get();
        return $rolePermissions->merge($directPermissions)->unique('id');
    }

    /**
     * Kiểm tra user có permission không
     */
    public function hasPermission(string $permission): bool
    {
        // Super admin có toàn quyền
        if ($this->role === 'admin' && $this->owner === true) {
            return true;
        }

        // Check permissions từ roles
        $hasFromRoles = $this->roles()
            ->whereHas('permissions', function ($query) use ($permission) {
                $query->where('permissions.name', $permission);
            })
            ->exists();

        if ($hasFromRoles) {
            return true;
        }

        // Check permissions trực tiếp
        return $this->directPermissions()
            ->where('permissions.name', $permission)
            ->exists();
    }

    /**
     * Kiểm tra user có bất kỳ permission nào trong danh sách
     */
    public function hasAnyPermission(array $permissions): bool
    {
        foreach ($permissions as $permission) {
            if ($this->hasPermission($permission)) {
                return true;
            }
        }
        return false;
    }

    /**
     * Kiểm tra user có tất cả permissions trong danh sách
     */
    public function hasAllPermissions(array $permissions): bool
    {
        foreach ($permissions as $permission) {
            if (!$this->hasPermission($permission)) {
                return false;
            }
        }
        return true;
    }

    public function getAvatarUrlAttribute()
    {
        if (!$this->avatar) {
            return asset('images/default-avatar.png');
        }

        return asset('storage/' . $this->avatar);
    }
}
