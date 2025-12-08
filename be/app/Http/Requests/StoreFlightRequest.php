<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreFlightRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'from_airport'   => 'required|size:3|different:to_airport',
            'to_airport'     => 'required|size:3',
            'flight_date'    => 'required|date|after_or_equal:today',
            'airline'        => 'required|string|max:100',
            'flight_number'  => 'required|string|max:10|regex:/^[A-Z]{1,2}[0-9]{1,4}$/i',
            'max_weight'     => 'required|numeric|min:1|max:20',
            'note'           => 'nullable|string|max:500',
        ];
    }

    public function messages(): array
    {
        return [
            'flight_number.regex'    => 'Số hiệu chuyến bay sai định dạng (VD: VN123, VJ999)',
            'from_airport.different' => 'Sân bay đi và đến phải khác nhau',
            'from_airport.size'      => 'Mã sân bay phải đúng 3 chữ cái',
            'to_airport.size'        => 'Mã sân bay phải đúng 3 chữ cái',
        ];
    }
}
