<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Request as ModelsRequest;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Request;
use Inertia\Inertia;
use Inertia\Response;
use Illuminate\Pagination\LengthAwarePaginator;

class RequestController extends Controller
{
    /**
     * Danh sách yêu cầu
     */
    public function index(): Response
    {
        $query = ModelsRequest::with(['sender', 'flight.customer', 'order']);

        // Filter theo status
        if (Request::has('status') && Request::get('status')) {
            $query->where('status', Request::get('status'));
        }

        // Filter theo priority
        if (Request::has('priority_level') && Request::get('priority_level')) {
            $query->where('priority_level', Request::get('priority_level'));
        }

        // Filter theo sender
        if (Request::has('sender_id')) {
            $query->where('sender_id', Request::get('sender_id'));
        }

        // Filter theo flight
        if (Request::has('flight_id')) {
            $query->where('flight_id', Request::get('flight_id'));
        }

        // Filter theo expired
        if (Request::has('expired')) {
            if (Request::get('expired') === 'true') {
                $query->where('expires_at', '<', now());
            } else {
                $query->where('expires_at', '>=', now());
            }
        }

        // Search
        if (Request::has('search')) {
            $search = Request::get('search');
            $query->where(function ($q) use ($search) {
                $q->where('uuid', 'like', "%{$search}%")
                    ->orWhere('item_description', 'like', "%{$search}%")
                    ->orWhereHas('sender', function ($q) use ($search) {
                        $q->where('name', 'like', "%{$search}%")
                            ->orWhere('email', 'like', "%{$search}%");
                    });
            });
        }

        // Sort
        $sortBy = Request::get('sort_by', 'created_at');
        $sortOrder = Request::get('sort_order', 'desc');
        $query->orderBy($sortBy, $sortOrder);

        // Pagination
        $perPage = Request::get('per_page', 15);
        $requestsPaginated = $query->paginate($perPage)->appends(Request::all());

        // Transform data
        $transformedRequests = $requestsPaginated->items();
        foreach ($transformedRequests as $key => $request) {
            $transformedRequests[$key] = [
                'id' => $request->id,
                'uuid' => $request->uuid,
                'sender' => [
                    'id' => $request->sender->id ?? null,
                    'name' => $request->sender->name ?? 'N/A',
                    'email' => $request->sender->email ?? 'N/A',
                ],
                'flight' => $request->flight ? [
                    'id' => $request->flight->id,
                    'from_airport' => $request->flight->from_airport,
                    'to_airport' => $request->flight->to_airport,
                    'flight_date' => $request->flight->flight_date->format('Y-m-d'),
                ] : null,
                'status' => $request->status,
                'priority_level' => $request->priority_level,
                'priority_label' => $request->priority_label,
                'reward' => $request->reward,
                'item_type' => $request->item_type,
                'item_value' => $request->item_value,
                'expires_at' => $request->expires_at?->format('Y-m-d H:i:s'),
                'is_expired' => $request->is_expired,
                'has_order' => $request->order !== null,
                'created_at' => $request->created_at->format('Y-m-d H:i:s'),
            ];
        }

        // Create new paginator
        $requests = new LengthAwarePaginator(
            $transformedRequests,
            $requestsPaginated->total(),
            $requestsPaginated->perPage(),
            $requestsPaginated->currentPage(),
            ['path' => $requestsPaginated->path()]
        );
        $requests->appends(Request::all());

        return Inertia::render('Admin/Requests/Index', [
            'filters' => Request::only('search', 'status', 'priority_level', 'sender_id', 'flight_id', 'expired', 'sort_by', 'sort_order'),
            'requests' => $requests,
        ]);
    }

    /**
     * Chi tiết yêu cầu
     */
    public function show($id): Response
    {
        $request = ModelsRequest::with([
            'sender',
            'flight.customer',
            'acceptedBy',
            'confirmedBy',
            'order',
        ])->findOrFail($id);

        return Inertia::render('Admin/Requests/Show', [
            'request' => $request,
        ]);
    }

    /**
     * Xóa yêu cầu
     */
    public function destroy($id): RedirectResponse
    {
        $request = ModelsRequest::findOrFail($id);

        if ($request->order) {
            return redirect()->back()->with('error', 'Không thể xóa yêu cầu đã có đơn hàng');
        }

        $request->delete();

        return redirect()->route('admin.requests.index')->with('success', 'Đã xóa yêu cầu thành công');
    }
}
