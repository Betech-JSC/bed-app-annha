<?php

namespace Database\Seeders;

use App\Models\PaymentMethod;
use Illuminate\Database\Seeder;

class PaymentMethodSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $methods = [
            [
                'code'         => 'BANK_TRANSFER',
                'name'         => 'Chuyển khoản ngân hàng',
                'provider'     => 'Vietcombank',
                'type'         => 'bank_transfer',
                'instructions' => "Chuyển khoản tới STK 0123 456 789 (VCB) - CTY SKY SEND.\nNội dung: SKYSD <SĐT>.",
                'metadata'     => [
                    'account_number' => '0123456789',
                    'account_name'   => 'SKY SEND COMPANY',
                    'bank_name'      => 'Vietcombank - CN HCM',
                ],
            ],
            [
                'code'         => 'MOMO',
                'name'         => 'Ví MoMo',
                'provider'     => 'MoMo',
                'type'         => 'ewallet',
                'instructions' => "Quét QR MoMo hoặc chuyển tới số 0909 000 111 (SkySend).\nNội dung: SKYSD <SĐT>.",
                'metadata'     => [
                    'phone'     => '0909000111',
                    'qr_code'   => null,
                ],
            ],
            [
                'code'         => 'ZALOPAY',
                'name'         => 'ZaloPay',
                'provider'     => 'ZaloPay',
                'type'         => 'ewallet',
                'instructions' => "Chuyển tiền tới ZaloPay 0909 000 222.\nNội dung: SKYSD <SĐT>.",
                'metadata'     => [
                    'phone' => '0909000222',
                ],
            ],
        ];

        foreach ($methods as $index => $method) {
            PaymentMethod::updateOrCreate(
                ['code' => $method['code']],
                array_merge($method, [
                    'min_amount'  => 50000,
                    'max_amount'  => 50000000,
                    'fee_percent' => $index === 0 ? 0 : 1.5,
                    'fee_flat'    => 0,
                    'is_active'   => true,
                ])
            );
        }
    }
}

