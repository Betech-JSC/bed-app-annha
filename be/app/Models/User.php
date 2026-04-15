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
        'department_id',
        'user_type',
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

    // ───── User Type Scopes ─────
    public function scopeEmployees($q)
    {
        return $q->has('employeeProfile');
    }

    public function scopePayrollEmployees($q)
    {
        return $q->has('salaryConfigs');
    }

    public function scopeCustomers($q)
    {
        return $q->doesntHave('employeeProfile');
    }

    // ───── User Type Helpers ─────
    public function isEmployee(): bool
    {
        return $this->employeeProfile()->exists();
    }

    public function hasSalaryConfig(): bool
    {
        return $this->salaryConfigs()->exists();
    }

    public function isCustomer(): bool
    {
        return !$this->isEmployee();
    }

    public function resolveRouteBinding($value, $field = null)
    {
        return $this->where($field ?? 'id', $value)->withTrashed()->firstOrFail();
    }

    // NOTE: account() relationship removed — Account model does not exist

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
        return $query->whereHas('roles', function($q) use ($role) {
            $q->where('name', $role);
        });
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

    // NOTE: wallet() and transactions() removed — Wallet/Transaction models do not exist

    /**
     * Roles của user (thông qua role_user pivot table)
     */
    public function roles()
    {
        return $this->belongsToMany(Role::class, 'role_user');
    }

    /**
     * Projects mà user được phân công vào (thông qua project_personnel pivot table)
     */
    public function projects(): BelongsToMany
    {
        return $this->belongsToMany(Project::class, 'project_personnel', 'user_id', 'project_id');
    }

    /**
     * Project personnel records của user
     */
    public function personnel(): HasMany
    {
        return $this->hasMany(ProjectPersonnel::class, 'user_id');
    }

    /**
     * Salary configurations of the user
     */
    public function salaryConfigs(): HasMany
    {
        return $this->hasMany(EmployeeSalaryConfig::class);
    }

    /**
     * Employee profile của user
     */
    public function employeeProfile()
    {
        return $this->hasOne(EmployeeProfile::class);
    }

    /**
     * Department của user
     */
    public function department(): BelongsTo
    {
        return $this->belongsTo(Department::class);
    }

    // NOTE: leaveRequests, leaveBalances, employmentContracts, employeeInsurance,
    //       employeeBenefits, performanceEvaluations, evaluationsAsEvaluator
    //       removed — corresponding models do not exist

    /**
     * Reminders của user
     */
    public function reminders(): HasMany
    {
        return $this->hasMany(Reminder::class);
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
     * Lấy danh sách permission names (array of strings)
     */
    public function getPermissionsArray(): array
    {
        return $this->permissions()->pluck('name')->toArray();
    }

    /**
     * Kiểm tra user có permission không
     */
    public function hasPermission(string $permission): bool
    {
        if ($this->isSuperAdmin()) {
            return true;
        }

        $permissions = $this->getPermissionsArray();
        return in_array($permission, $permissions);
    }

    /**
     * Kiểm tra user có phải super admin không
     * Super admin là user có tất cả permissions (được gán qua role)
     * @deprecated Sử dụng hasPermission() thay vì check này
     */
    public function isSuperAdmin(): bool
    {
        // Check if user has explicit 'super_admin' role
        if ($this->roles()->where('name', 'super_admin')->exists()) {
            return true;
        }

        // Fallback: Check if user has ALL permissions
        // (Useful for systems where roles might be renamed but permissions remain)
        $allPermissions = \App\Models\Permission::count();
        if ($allPermissions === 0) return false;
        
        $userPermissions = count($this->getPermissionsArray());
        return $userPermissions === $allPermissions;
    }

    /**
     * Kiểm tra user có phải admin không (dựa trên permissions)
     * Admin là user có settings.manage permission
     */
    public function isAdmin(): bool
    {
        return $this->hasPermission(\App\Constants\Permissions::SETTINGS_MANAGE);
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

    public function kpis(): HasMany
    {
        return $this->hasMany(Kpi::class);
    }

    public function getAvatarUrlAttribute()
    {
        if (!$this->avatar) {
            return asset('images/default-avatar.png');
        }

        return asset('storage/' . $this->avatar);
    }

    /**
     * Get the user's full name
     * This accessor ensures name is always available, combining first_name and last_name if needed
     */
    public function getNameAttribute($value)
    {
        // If name column has a value, use it
        if (!empty($value) && trim($value) !== '') {
            return $value;
        }

        // Otherwise, combine first_name and last_name
        $firstName = $this->attributes['first_name'] ?? '';
        $lastName = $this->attributes['last_name'] ?? '';
        $fullName = trim($firstName . ' ' . $lastName);

        // Return combined name or fallback to email
        return !empty($fullName) ? $fullName : ($this->attributes['email'] ?? 'N/A');
    }
}
