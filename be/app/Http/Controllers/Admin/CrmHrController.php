<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Constants\Permissions;
use App\Models\User;
use App\Models\Department;
use App\Models\Role;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class CrmHrController extends Controller
{
    use CrmAuthorization;
    /**
     * Employees list
     */
    public function employees(Request $request)
    {
        $admin = Auth::guard('admin')->user();
        $this->crmRequire($admin, Permissions::PERSONNEL_VIEW);
        $query = User::with(['roles', 'department']);

        if ($search = $request->query('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%")
                    ->orWhere('phone', 'like', "%{$search}%");
            });
        }

        if ($departmentId = $request->query('department_id')) {
            $query->where('department_id', $departmentId);
        }

        $employees = $query->orderByDesc('created_at')->paginate(20)->withQueryString();

        $stats = [
            'total' => User::count(),
            'active' => User::whereNull('deleted_at')->count(),
            'banned' => User::onlyTrashed()->count(),
        ];

        $departments = Department::select('id', 'name')->orderBy('name')->get();
        $roles = Role::select('id', 'name')->orderBy('name')->get();

        return Inertia::render('Crm/Hr/Employees/Index', [
            'employees' => $employees,
            'stats' => $stats,
            'departments' => $departments,
            'roles' => $roles,
            'filters' => $request->only(['search', 'department_id']),
        ]);
    }

    public function storeEmployee(Request $request)
    {
        $admin = Auth::guard('admin')->user();
        $this->crmRequire($admin, Permissions::PERSONNEL_ASSIGN);
        $validated = $request->validate([
            'first_name' => 'required|string|max:255',
            'last_name' => 'nullable|string|max:255',
            'email' => 'required|email|unique:users,email',
            'phone' => 'nullable|string|max:20',
            'password' => 'required|string|min:6',
            'department_id' => 'nullable|exists:departments,id',
            'role_ids' => 'nullable|array',
            'role_ids.*' => 'exists:roles,id',
        ]);

        $user = User::create([
            'first_name' => $validated['first_name'],
            'last_name' => $validated['last_name'] ?? '',
            'name' => trim(($validated['first_name'] ?? '') . ' ' . ($validated['last_name'] ?? '')),
            'email' => $validated['email'],
            'phone' => $validated['phone'] ?? null,
            'password' => Hash::make($validated['password']),
            'department_id' => $validated['department_id'] ?? null,
        ]);

        if (!empty($validated['role_ids'])) {
            $user->roles()->sync($validated['role_ids']);
        }

        return redirect()->route('crm.hr.employees')->with('success', 'Đã thêm nhân viên thành công.');
    }

    public function updateEmployee(Request $request, $id)
    {
        $admin = Auth::guard('admin')->user();
        $this->crmRequire($admin, Permissions::PERSONNEL_ASSIGN);
        $user = User::findOrFail($id);

        $validated = $request->validate([
            'first_name' => 'sometimes|string|max:255',
            'last_name' => 'nullable|string|max:255',
            'email' => ['sometimes', 'email', Rule::unique('users')->ignore($user->id)],
            'phone' => 'nullable|string|max:20',
            'password' => 'nullable|string|min:6',
            'department_id' => 'nullable|exists:departments,id',
            'role_ids' => 'nullable|array',
            'role_ids.*' => 'exists:roles,id',
        ]);

        if (isset($validated['password']) && $validated['password']) {
            $validated['password'] = Hash::make($validated['password']);
        } else {
            unset($validated['password']);
        }

        if (isset($validated['first_name'])) {
            $validated['name'] = trim(($validated['first_name'] ?? $user->first_name) . ' ' . ($validated['last_name'] ?? $user->last_name));
        }

        $roleIds = $validated['role_ids'] ?? null;
        unset($validated['role_ids']);

        $user->update($validated);

        if ($roleIds !== null) {
            $user->roles()->sync($roleIds);
        }

        return back()->with('success', 'Đã cập nhật nhân viên.');
    }

    public function destroyEmployee($id)
    {
        $admin = Auth::guard('admin')->user();
        $this->crmRequire($admin, Permissions::PERSONNEL_REMOVE);
        User::findOrFail($id)->delete();
        return redirect()->route('crm.hr.employees')->with('success', 'Đã xóa nhân viên.');
    }

    /**
     * Departments
     */
    public function departments(Request $request)
    {
        $admin = Auth::guard('admin')->user();
        $this->crmRequire($admin, Permissions::PERSONNEL_VIEW);
        $departments = Department::with('manager:id,name', 'parent:id,name')
            ->withCount('employees as users_count')
            ->orderBy('name')
            ->get();

        return Inertia::render('Crm/Hr/Departments/Index', [
            'departments' => $departments,
            'users' => User::select('id', 'name')->orderBy('name')->get(),
            'allDepartments' => Department::select('id', 'name')->orderBy('name')->get(),
        ]);
    }

    /**
     * Organization Chart — hierarchical tree view
     */
    public function orgChart()
    {
        $admin = Auth::guard('admin')->user();
        $this->crmRequire($admin, Permissions::PERSONNEL_VIEW);
        $departments = Department::with([
            'manager:id,name,email,image',
            'employees:id,name,email,image,department_id',
            'children' => function ($q) {
                $q->with([
                    'manager:id,name,email,image',
                    'employees:id,name,email,image,department_id',
                    'children' => function ($q2) {
                        $q2->with(['manager:id,name,email,image', 'employees:id,name,email,image,department_id'])
                           ->withCount('employees as users_count');
                    },
                ])->withCount('employees as users_count');
            },
        ])
        ->withCount('employees as users_count')
        ->whereNull('parent_id')
        ->orderBy('name')
        ->get();

        $totalEmployees = User::count();
        $totalDepartments = Department::count();

        return Inertia::render('Crm/Hr/OrgChart/Index', [
            'departments' => $departments,
            'stats' => [
                'totalEmployees' => $totalEmployees,
                'totalDepartments' => $totalDepartments,
            ],
        ]);
    }

    public function storeDepartment(Request $request)
    {
        $admin = Auth::guard('admin')->user();
        $this->crmRequire($admin, Permissions::PERSONNEL_ASSIGN);
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'code' => 'nullable|string|max:50|unique:departments,code',
            'description' => 'nullable|string',
            'manager_id' => 'nullable|exists:users,id',
        ]);

        Department::create($validated);
        return back()->with('success', 'Đã thêm phòng ban.');
    }

    public function updateDepartment(Request $request, $id)
    {
        $admin = Auth::guard('admin')->user();
        $this->crmRequire($admin, Permissions::PERSONNEL_ASSIGN);
        $dept = Department::findOrFail($id);
        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'code' => ['sometimes', 'string', 'max:50', Rule::unique('departments', 'code')->ignore($dept->id)],
            'description' => 'nullable|string',
            'manager_id' => 'nullable|exists:users,id',
        ]);

        $dept->update($validated);
        return back()->with('success', 'Đã cập nhật phòng ban.');
    }

    public function destroyDepartment($id)
    {
        $admin = Auth::guard('admin')->user();
        $this->crmRequire($admin, Permissions::PERSONNEL_REMOVE);
        Department::findOrFail($id)->delete();
        return back()->with('success', 'Đã xóa phòng ban.');
    }
}
