<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateFlightRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'from_airport'   => 'sometimes|string|size:3|regex:/^[A-Z]{3}$/',
            'to_airport'     => 'sometimes|string|size:3|regex:/^[A-Z]{3}$/',
            'flight_date'    => 'sometimes|date|after_or_equal:today',
            'airline'        => 'sometimes|string|max:100',
            'flight_number'  => 'sometimes|string|max:10',
            'max_weight'     => 'sometimes|numeric|min:0|max:999999.99',
            'note'           => 'nullable|string|max:1000',
            'note'           => 'nullable|string|max:1000',
            'item_value'     => 'nullable',
            'item_type'      => 'nullable',
        ];
    }

    public function messages(): array
    {
        return [
            'from_airport.size'       => 'Mã sân bay đi phải đúng 3 chữ cái (VD: HAN, SGN)',
            'from_airport.regex'      => 'Mã sân bay chỉ được viết hoa, không dấu cách',
            'to_airport.size'         => 'Mã sân bay đến phải đúng 3 chữ cái',
            'to_airport.regex'        => 'Mã sân bay chỉ được viết hoa, không dấu cách',
            'flight_date.after_or_equal' => 'Ngày bay không được là ngày trong quá khứ',
            'max_weight.numeric'      => 'Khối lượng tối đa phải là số',
            'max_weight.min'          => 'Khối lượng không được âm',
        ];
    }
}
