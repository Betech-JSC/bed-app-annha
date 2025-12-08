<?php

namespace App\Helpers;

class ApiResponse
{
    /**
     * Trả về phản hồi thành công
     *
     * @param mixed $data
     * @param string $message
     * @param int $statusCode
     * @return \Illuminate\Http\JsonResponse
     */
    public static function success($data = null, $message = 'Success', $statusCode = 200)
    {
        return response()->json([
            'status' => 'success',
            'message' => $message,
            'data' => $data
        ], $statusCode);
    }

    /**
     * Trả về phản hồi lỗi
     *
     * @param mixed $errors
     * @param string $message
     * @param int $statusCode
     * @return \Illuminate\Http\JsonResponse
     */
    public static function error($errors = null, $message = 'Error', $statusCode = 400)
    {
        return response()->json([
            'status' => 'error',
            'message' => $message,
            'errors' => $errors
        ], $statusCode);
    }

    /**
     * Trả về phản hồi với lỗi validation
     *
     * @param $validator
     * @return \Illuminate\Http\JsonResponse
     */
    public static function validationError($validator)
    {
        return self::error($validator->errors(), 'Validation Failed', 422);
    }
}
