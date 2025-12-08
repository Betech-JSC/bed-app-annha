<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\UpdateFlightRequest;
use Illuminate\Http\Request;

use App\Models\Flight;
use App\Models\User;
use App\Services\FirebaseService;
use App\Services\ExpoPushService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Auth;

class FlightController extends Controller
{
    public function __construct(
        private FirebaseService $firebaseService
    ) {}
    /**
     * Lấy danh sách chuyến bay đã đăng của user hiện tại
     */
    public function index(Request $request)
    {
        $user_id = auth()->id();

        $query = Flight::where('customer_id', $user_id)
            ->with('requests')
            ->latest(); // mới nhất trước

        // Tùy chọn: lọc theo trạng thái (pending, verified, cancelled...)
        if ($request->has('status') && in_array($request->status, ['pending', 'verified', 'completed'])) {
            $query->where('status', $request->status);
        }

        // Phân trang (10 chuyến/trang - bạn có thể đổi)
        $flights = $query->paginate(10);

        return response()->json([
            'success' => true,
            'message' => 'Lấy danh sách chuyến bay thành công',
            'data'    => $flights->items(),
            'pagination' => [
                'current_page' => $flights->currentPage(),
                'total_pages'  => $flights->lastPage(),
                'total_items'  => $flights->total(),
                'per_page'     => $flights->perPage(),
                'has_more'     => $flights->hasMorePages(),
            ]
        ]);
    }

    // Đăng chuyến bay
    public function store(Request $request)
    {
        $request->validate([
            'from_airport' => 'required|string|max:10',
            'to_airport' => 'required|string|max:10',
            'flight_date' => 'required|date',
            'airline' => 'required|string|max:255',
            'flight_number' => 'required|string|max:20',
            'max_weight' => 'required|numeric|min:0.1',
            'note' => 'nullable|string|max:1000',
            'attachments' => 'nullable|array',
            'attachments.*' => 'required|integer|exists:attachments,id',
        ]);

        return DB::transaction(function () use ($request) {
            $flight = Flight::create([
                'uuid'           => Str::uuid(),
                'customer_id'    => auth()->id(),
                'from_airport'   => strtoupper($request->from_airport),
                'to_airport'     => strtoupper($request->to_airport),
                'flight_date'    => $request->flight_date,
                'airline'        => $request->airline,
                'status'         => 'pending',
                'flight_number'  => strtoupper($request->flight_number),
                'max_weight'     => $request->max_weight,
                'booked_weight'  => 0.00,
                'note'           => $request->note,
                'verified'       => false,
            ]);

            // Attach files nếu có
            if ($request->has('attachments') && is_array($request->attachments)) {
                foreach ($request->attachments as $attachmentId) {
                    $attachment = \App\Models\Attachment::find($attachmentId);
                    if ($attachment && $attachment->uploaded_by === auth()->id()) {
                        $attachment->update([
                            'attachable_type' => Flight::class,
                            'attachable_id' => $flight->id,
                        ]);
                    }
                }
            }

            // Load attachments để trả về
            $flight->load('attachments');

            return response()->json([
                'success' => true,
                'message' => 'Đăng chuyến bay thành công!',
                'data'    => $flight,
            ], 201);
        });
    }

    public function show($id)
    {
        $flight = Flight::where('customer_id', Auth::id())
            ->where('id', $id)
            ->firstOrFail();

        return response()->json([
            'success' => true,
            'data'    => $flight
        ]);
    }

    // cập nhật chuyến bay
    public function update(UpdateFlightRequest $request, $id)
    {
        return DB::transaction(function () use ($request, $id) {
            $flight = Flight::where('customer_id', auth()->id())
                ->where('id', $id)
                ->firstOrFail();

            $oldStatus = $flight->status;

            $flight->update([
                'from_airport'   => strtoupper($request->filled('from_airport') ? $request->from_airport : $flight->from_airport),
                'to_airport'     => strtoupper($request->filled('to_airport') ? $request->to_airport : $flight->to_airport),
                'flight_date'    => $request->filled('flight_date') ? $request->flight_date : $flight->flight_date,
                'airline'        => $request->filled('airline') ? $request->airline : $flight->airline,
                'flight_number'  => strtoupper($request->filled('flight_number') ? $request->flight_number : $flight->flight_number),
                'max_weight'     => $request->filled('max_weight') ? $request->max_weight : $flight->max_weight,
                'item_value'     => $request->filled('item_value') ? $request->item_value : $flight->item_value,
                'status'         => $request->filled('status') ? $request->status : $flight->status,
                'item_type'      => $request->filled('item_type') ? $request->item_type : $flight->item_type,
                'note'           => $request->filled('note') ? $request->note : $flight->note,
            ]);

            // Nếu status thay đổi, gửi notification
            if ($request->filled('status') && $oldStatus !== $flight->status) {
                $this->pushFlightStatusNotification($flight, $oldStatus, $flight->status);
            }

            return response()->json([
                'success' => true,
                'message' => 'Cập nhật chuyến bay thành công!',
                'data'    => $flight
            ]);
        });
    }

    // Hủy chuyến bay
    public function destroy($id)
    {
        return DB::transaction(function () use ($id) {
            $flight = Flight::where('customer_id', auth()->id())
                ->where('id', $id)
                ->firstOrFail();

            // Không cho hủy nếu đã có người đặt hàng
            if ($flight->booked_weight > 0) {
                return response()->json([
                    'success' => false,
                    'message' => 'Không thể hủy vì đã có khách đặt hàng!',
                ], 403);
            }

            // Nếu đã hủy rồi thì không cho hủy lại
            if ($flight->status === 'cancelled') {
                return response()->json([
                    'success' => false,
                    'message' => 'Chuyến bay đã được hủy trước đó!',
                ], 400);
            }

            $oldStatus = $flight->status;

            // HỦY CHUYẾN BAY - chỉ đổi status là đủ!
            $flight->update([
                'status' => 'cancelled'
            ]);

            // Gửi notification khi hủy chuyến bay
            $this->pushFlightStatusNotification($flight, $oldStatus, 'cancelled');

            return response()->json([
                'success' => true,
                'message' => 'Hủy chuyến bay thành công!',
                'data'    => $flight
            ]);
        });
    }

    /**
     * Admin xác thực chuyến bay (chuyển từ pending → verified)
     *
     * @param  int  $id  ID của chuyến bay
     * @return \Illuminate\Http\JsonResponse
     */
    public function verify($id)
    {

        return DB::transaction(function () use ($id) {
            $flight = Flight::with('customer')->findOrFail($id);

            // Chỉ cho phép verify khi đang ở trạng thái pending
            if ($flight->status !== 'pending') {
                return response()->json([
                    'success' => false,
                    'message' => 'Chuyến bay không thể xác thực. Trạng thái hiện tại: ' . $flight->status,
                ], 400);
            }

            $oldStatus = $flight->status;

            // Cập nhật trạng thái + verified = true
            $flight->update([
                'status'    => 'verified',
                'verified'  => true,
                'verified_at' => now(),
                'verified_by' => auth()->id(), // lưu lại admin nào verify (tùy chọn)
            ]);

            // Gửi notification cho customer khi flight được verify
            $this->pushFlightStatusNotification($flight, $oldStatus, 'verified');

            return response()->json([
                'success' => true,
                'message' => 'Xác thực chuyến bay thành công!',
                'data'    => $flight->refresh(),
            ]);
        });
    }

    /**
     * Lấy danh sách khách hàng (customers) có sẵn cho sender gửi request
     * Chỉ lấy các flights đã verified và còn trống hành lý
     *
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function availableCustomers(Request $request)
    {
        $senderId = auth()->id();
        $perPage = (int) min($request->query('per_page', 15), 50);

        $query = Flight::with(['customer'])
            ->where('verified', true)
            ->where('status', 'verified')
            ->where('customer_id', '!=', $senderId) // Không lấy flights của chính sender
            ->whereRaw('(max_weight - booked_weight) > 0') // Còn trống hành lý
            ->whereDate('flight_date', '>=', now()->toDateString()) // Chỉ lấy flights tương lai
            ->latest('flight_date');

        // Filter theo sân bay đi
        if ($request->filled('from_airport')) {
            $query->where('from_airport', strtoupper($request->from_airport));
        }

        // Filter theo sân bay đến
        if ($request->filled('to_airport')) {
            $query->where('to_airport', strtoupper($request->to_airport));
        }

        // Filter theo ngày bay
        if ($request->filled('flight_date')) {
            $query->whereDate('flight_date', $request->flight_date);
        }

        // Filter theo hãng bay
        if ($request->filled('airline')) {
            $query->where('airline', 'like', '%' . $request->airline . '%');
        }

        $flights = $query->paginate($perPage);

        // Transform data để trả về thông tin customer + flight
        $flights->getCollection()->transform(function ($flight) {
            $availableWeight = round($flight->max_weight - $flight->booked_weight, 2);
            $customer = $flight->customer;

            return [
                'id' => $flight->id,
                'uuid' => $flight->uuid,
                'customer' => [
                    'id' => $customer->id ?? null,
                    'name' => $customer->name ?? 'Người dùng',
                    'avatar' => $customer->avatar ?? null,
                    'phone' => $customer->phone ?? null,
                    'email' => $customer->email ?? null,
                    'rating' => 5.0, // TODO: Tính rating thực tế từ orders completed
                    'success_rate' => 98, // TODO: Tính success rate thực tế
                ],
                'flight' => [
                    'id' => $flight->id,
                    'uuid' => $flight->uuid,
                    'from_airport' => $flight->from_airport,
                    'to_airport' => $flight->to_airport,
                    'route' => $flight->from_airport . ' → ' . $flight->to_airport,
                    'flight_date' => $flight->flight_date->format('Y-m-d'),
                    'flight_date_formatted' => $flight->flight_date->format('d/m/Y'),
                    'airline' => $flight->airline,
                    'flight_number' => $flight->flight_number,
                    'available_weight' => $availableWeight,
                    'max_weight' => $flight->max_weight,
                    'booked_weight' => $flight->booked_weight,
                    'item_type' => $flight->item_type ?? null,
                ],
                'can_send_request' => $availableWeight > 0,
            ];
        });

        return response()->json([
            'success' => true,
            'data' => $flights->items(),
            'pagination' => [
                'current_page' => $flights->currentPage(),
                'total_pages' => $flights->lastPage(),
                'total_items' => $flights->total(),
                'per_page' => $flights->perPage(),
                'has_more' => $flights->hasMorePages(),
            ],
        ]);
    }
}
