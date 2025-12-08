<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Contracts\Validation\Validator;

class StorePrivateRequestRequest extends FormRequest
{
    public function authorize(): bool
    {
        return auth()->check();
    }

    public function rules(): array
    {
        return [
            'flight_id'           => 'required|exists:flights,id',
            'reward'              => 'required|numeric|min:50000|max:10000000',
            'item_value'          => 'required|numeric|min:100000',
            'item_description'    => 'required|string|max:1000',
            'time_slot'           => 'required|in:morning,afternoon,evening,any',
            'note'                => 'nullable|string|max:500',
            'priority_level'      => 'nullable|in:normal,priority,urgent',
        ];
    }

    public function messages(): array
    {
        return [
            'flight_id.required'          => 'Vui lòng chọn chuyến bay.',
            'flight_id.exists'            => 'Chuyến bay không tồn tại.',

            'reward.required'             => 'Vui lòng nhập số tiền thưởng.',
            'reward.numeric'              => 'Số tiền thưởng phải là số.',
            'reward.min'                  => 'Tiền thưởng tối thiểu là 50.000đ.',
            'reward.max'                  => 'Tiền thưởng tối đa là 10.000.000đ.',

            'item_value.required'         => 'Vui lòng nhập giá trị món hàng.',
            'item_value.numeric'          => 'Giá trị món hàng phải là số.',
            'item_value.min'              => 'Giá trị món hàng tối thiểu là 100.000đ.',

            'item_description.required'   => 'Vui lòng mô tả món hàng cần mang.',
            'item_description.max'       => 'Mô tả không được quá 1000 ký tự.',

            'time_slot.required'          => 'Vui lòng chọn khung giờ giao nhận.',
            'time_slot.in'                => 'Khung giờ không hợp lệ.',

            'note.max'                    => 'Ghi chú không được quá 500 ký tự.',
            'priority_level.in'           => 'Mức ưu tiên không hợp lệ.',
        ];
    }

    // Tùy chỉnh response khi validate thất bại
    protected function failedValidation(Validator $validator)
    {
        throw new HttpResponseException(response()->json([
            'success' => false,
            'message' => 'Dữ liệu không hợp lệ.',
            'errors'  => $validator->errors()
        ], 422));
    }
}
