<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Validation Language Lines — Tiếng Việt
    |--------------------------------------------------------------------------
    */

    'accepted'             => ':Attribute phải được chấp nhận.',
    'accepted_if'          => ':Attribute phải được chấp nhận khi :other là :value.',
    'active_url'           => ':Attribute không phải là một URL hợp lệ.',
    'after'                => ':Attribute phải là ngày sau :date.',
    'after_or_equal'       => ':Attribute phải là ngày sau hoặc bằng :date.',
    'alpha'                => ':Attribute chỉ được chứa chữ cái.',
    'alpha_dash'           => ':Attribute chỉ được chứa chữ cái, số, dấu gạch ngang và dấu gạch dưới.',
    'alpha_num'            => ':Attribute chỉ được chứa chữ cái và số.',
    'array'                => ':Attribute phải là một mảng.',
    'ascii'                => ':Attribute chỉ được chứa ký tự ASCII.',
    'before'               => ':Attribute phải là ngày trước :date.',
    'before_or_equal'      => ':Attribute phải là ngày trước hoặc bằng :date.',
    'between' => [
        'array'   => ':Attribute phải có từ :min đến :max phần tử.',
        'file'    => ':Attribute phải có kích thước từ :min đến :max KB.',
        'numeric' => ':Attribute phải nằm trong khoảng :min đến :max.',
        'string'  => ':Attribute phải có từ :min đến :max ký tự.',
    ],
    'boolean'              => ':Attribute phải là đúng hoặc sai.',
    'can'                  => ':Attribute chứa giá trị không được phép.',
    'confirmed'            => 'Xác nhận :attribute không khớp.',
    'contains'             => ':Attribute thiếu một giá trị bắt buộc.',
    'current_password'     => 'Mật khẩu không đúng.',
    'date'                 => ':Attribute không phải ngày hợp lệ.',
    'date_equals'          => ':Attribute phải là ngày :date.',
    'date_format'          => ':Attribute không đúng định dạng :format.',
    'decimal'              => ':Attribute phải có :decimal chữ số thập phân.',
    'declined'             => ':Attribute phải bị từ chối.',
    'declined_if'          => ':Attribute phải bị từ chối khi :other là :value.',
    'different'            => ':Attribute và :other phải khác nhau.',
    'digits'               => ':Attribute phải có :digits chữ số.',
    'digits_between'       => ':Attribute phải có từ :min đến :max chữ số.',
    'dimensions'           => ':Attribute có kích thước ảnh không hợp lệ.',
    'distinct'             => ':Attribute có giá trị bị trùng.',
    'doesnt_end_with'      => ':Attribute không được kết thúc bằng: :values.',
    'doesnt_start_with'    => ':Attribute không được bắt đầu bằng: :values.',
    'email'                => ':Attribute phải là địa chỉ email hợp lệ.',
    'ends_with'            => ':Attribute phải kết thúc bằng: :values.',
    'enum'                 => 'Giá trị :attribute đã chọn không hợp lệ.',
    'exists'               => 'Giá trị :attribute đã chọn không hợp lệ.',
    'extensions'           => ':Attribute phải có phần mở rộng: :values.',
    'file'                 => ':Attribute phải là một tệp.',
    'filled'               => ':Attribute không được để trống.',
    'gt' => [
        'array'   => ':Attribute phải có nhiều hơn :value phần tử.',
        'file'    => ':Attribute phải lớn hơn :value KB.',
        'numeric' => ':Attribute phải lớn hơn :value.',
        'string'  => ':Attribute phải nhiều hơn :value ký tự.',
    ],
    'gte' => [
        'array'   => ':Attribute phải có ít nhất :value phần tử.',
        'file'    => ':Attribute phải lớn hơn hoặc bằng :value KB.',
        'numeric' => ':Attribute phải lớn hơn hoặc bằng :value.',
        'string'  => ':Attribute phải có ít nhất :value ký tự.',
    ],
    'hex_color'            => ':Attribute phải là mã màu hex hợp lệ.',
    'image'                => ':Attribute phải là hình ảnh.',
    'in'                   => 'Giá trị :attribute đã chọn không hợp lệ.',
    'in_array'             => ':Attribute không tồn tại trong :other.',
    'integer'              => ':Attribute phải là số nguyên.',
    'ip'                   => ':Attribute phải là địa chỉ IP hợp lệ.',
    'ipv4'                 => ':Attribute phải là địa chỉ IPv4 hợp lệ.',
    'ipv6'                 => ':Attribute phải là địa chỉ IPv6 hợp lệ.',
    'json'                 => ':Attribute phải là chuỗi JSON hợp lệ.',
    'list'                 => ':Attribute phải là danh sách.',
    'lowercase'            => ':Attribute phải là chữ thường.',
    'lt' => [
        'array'   => ':Attribute phải có ít hơn :value phần tử.',
        'file'    => ':Attribute phải nhỏ hơn :value KB.',
        'numeric' => ':Attribute phải nhỏ hơn :value.',
        'string'  => ':Attribute phải ít hơn :value ký tự.',
    ],
    'lte' => [
        'array'   => ':Attribute không được có nhiều hơn :value phần tử.',
        'file'    => ':Attribute phải nhỏ hơn hoặc bằng :value KB.',
        'numeric' => ':Attribute phải nhỏ hơn hoặc bằng :value.',
        'string'  => ':Attribute không được nhiều hơn :value ký tự.',
    ],
    'mac_address'          => ':Attribute phải là địa chỉ MAC hợp lệ.',
    'max' => [
        'array'   => ':Attribute không được có nhiều hơn :max phần tử.',
        'file'    => ':Attribute không được lớn hơn :max KB.',
        'numeric' => ':Attribute không được lớn hơn :max.',
        'string'  => ':Attribute không được nhiều hơn :max ký tự.',
    ],
    'max_digits'           => ':Attribute không được có nhiều hơn :max chữ số.',
    'mimes'                => ':Attribute phải là tệp có định dạng: :values.',
    'mimetypes'            => ':Attribute phải là tệp có định dạng: :values.',
    'min' => [
        'array'   => ':Attribute phải có ít nhất :min phần tử.',
        'file'    => ':Attribute phải có kích thước ít nhất :min KB.',
        'numeric' => ':Attribute phải ít nhất là :min.',
        'string'  => ':Attribute phải có ít nhất :min ký tự.',
    ],
    'min_digits'           => ':Attribute phải có ít nhất :min chữ số.',
    'missing'              => ':Attribute không được có mặt.',
    'missing_if'           => ':Attribute không được có mặt khi :other là :value.',
    'missing_unless'       => ':Attribute không được có mặt trừ khi :other là :value.',
    'missing_with'         => ':Attribute không được có mặt khi :values có mặt.',
    'missing_with_all'     => ':Attribute không được có mặt khi :values đều có mặt.',
    'multiple_of'          => ':Attribute phải là bội số của :value.',
    'not_in'               => 'Giá trị :attribute đã chọn không hợp lệ.',
    'not_regex'            => 'Định dạng :attribute không hợp lệ.',
    'numeric'              => ':Attribute phải là số.',
    'password' => [
        'letters'       => ':Attribute phải chứa ít nhất một chữ cái.',
        'mixed'         => ':Attribute phải chứa ít nhất một chữ hoa và một chữ thường.',
        'numbers'       => ':Attribute phải chứa ít nhất một chữ số.',
        'symbols'       => ':Attribute phải chứa ít nhất một ký tự đặc biệt.',
        'uncompromised' => ':Attribute đã xuất hiện trong một vụ rò rỉ dữ liệu. Vui lòng chọn :attribute khác.',
    ],
    'present'              => ':Attribute phải có mặt.',
    'present_if'           => ':Attribute phải có mặt khi :other là :value.',
    'present_unless'       => ':Attribute phải có mặt trừ khi :other là :value.',
    'present_with'         => ':Attribute phải có mặt khi :values có mặt.',
    'present_with_all'     => ':Attribute phải có mặt khi :values đều có mặt.',
    'prohibited'           => ':Attribute bị cấm.',
    'prohibited_if'        => ':Attribute bị cấm khi :other là :value.',
    'prohibited_if_accepted' => ':Attribute bị cấm khi :other được chấp nhận.',
    'prohibited_if_declined' => ':Attribute bị cấm khi :other bị từ chối.',
    'prohibited_unless'    => ':Attribute bị cấm trừ khi :other nằm trong :values.',
    'prohibits'            => ':Attribute cấm :other có mặt.',
    'regex'                => 'Định dạng :attribute không hợp lệ.',
    'required'             => ':Attribute không được để trống.',
    'required_array_keys'  => ':Attribute phải chứa: :values.',
    'required_if'          => ':Attribute là bắt buộc khi :other là :value.',
    'required_if_accepted' => ':Attribute là bắt buộc khi :other được chấp nhận.',
    'required_if_declined' => ':Attribute là bắt buộc khi :other bị từ chối.',
    'required_unless'      => ':Attribute là bắt buộc trừ khi :other nằm trong :values.',
    'required_with'        => ':Attribute là bắt buộc khi có :values.',
    'required_with_all'    => ':Attribute là bắt buộc khi có :values.',
    'required_without'     => ':Attribute là bắt buộc khi không có :values.',
    'required_without_all' => ':Attribute là bắt buộc khi không có :values nào.',
    'same'                 => ':Attribute và :other phải giống nhau.',
    'size' => [
        'array'   => ':Attribute phải chứa :size phần tử.',
        'file'    => ':Attribute phải có kích thước :size KB.',
        'numeric' => ':Attribute phải bằng :size.',
        'string'  => ':Attribute phải có :size ký tự.',
    ],
    'starts_with'          => ':Attribute phải bắt đầu bằng: :values.',
    'string'               => ':Attribute phải là chuỗi ký tự.',
    'timezone'             => ':Attribute phải là múi giờ hợp lệ.',
    'unique'               => ':Attribute đã tồn tại.',
    'uploaded'             => ':Attribute tải lên thất bại.',
    'uppercase'            => ':Attribute phải là chữ hoa.',
    'url'                  => ':Attribute phải là URL hợp lệ.',
    'ulid'                 => ':Attribute phải là ULID hợp lệ.',
    'uuid'                 => ':Attribute phải là UUID hợp lệ.',

    /*
    |--------------------------------------------------------------------------
    | Custom Validation Language Lines
    |--------------------------------------------------------------------------
    */

    'custom' => [
        'attachments' => [
            'required' => 'Vui lòng đính kèm ít nhất một tệp.',
        ],
        'files' => [
            'required' => 'Vui lòng chọn ít nhất một tệp.',
        ],
        'rejected_reason' => [
            'required' => 'Vui lòng nhập lý do từ chối.',
        ],
        'rejection_reason' => [
            'required' => 'Vui lòng nhập lý do từ chối.',
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | Custom Validation Attributes — Tên hiển thị tiếng Việt
    |--------------------------------------------------------------------------
    */

    'attributes' => [
        // Project
        'name'                   => 'tên',
        'description'            => 'mô tả',
        'customer_id'            => 'khách hàng',
        'project_manager_id'     => 'quản lý dự án',
        'start_date'             => 'ngày bắt đầu',
        'end_date'               => 'ngày kết thúc',
        'status'                 => 'trạng thái',

        // Cost
        'amount'                 => 'số tiền',
        'cost_date'              => 'ngày chi phí',
        'cost_group_id'          => 'nhóm chi phí',
        'category'               => 'danh mục',
        'supplier_id'            => 'nhà cung cấp',
        'subcontractor_id'       => 'nhà thầu phụ',
        'budget_item_id'         => 'hạng mục ngân sách',
        'material_id'            => 'vật tư',
        'quantity'               => 'số lượng',
        'unit'                   => 'đơn vị',

        // Contract
        'contract_value'         => 'giá trị hợp đồng',
        'signed_date'            => 'ngày ký',
        'contract_number'        => 'số hợp đồng',

        // Payment
        'payment_number'         => 'đợt thanh toán',
        'due_date'               => 'ngày đến hạn',
        'paid_date'              => 'ngày thanh toán',
        'contract_id'            => 'hợp đồng',
        'notes'                  => 'ghi chú',

        // Personnel
        'user_id'                => 'nhân viên',
        'personnel_role_id'      => 'vai trò',
        'role_id'                => 'vai trò',

        // Construction Log
        'log_date'               => 'ngày nhật ký',
        'weather'                => 'thời tiết',
        'work_done'              => 'nội dung công việc',
        'personnel_count'        => 'số nhân sự',
        'completion_percentage'  => 'tiến độ hoàn thành',

        // Defect
        'severity'               => 'mức độ nghiêm trọng',
        'defect_type'            => 'loại lỗi',
        'task_id'                => 'công việc',
        'acceptance_stage_id'    => 'giai đoạn nghiệm thu',
        'reported_by'            => 'người báo cáo',
        'fixed_by'               => 'người sửa',

        // Change Request
        'title'                  => 'tiêu đề',
        'change_type'            => 'loại thay đổi',
        'priority'               => 'mức ưu tiên',
        'impact'                 => 'ảnh hưởng',
        'reason'                 => 'lý do',

        // Risk
        'likelihood'             => 'khả năng xảy ra',
        'mitigation_plan'        => 'kế hoạch giảm thiểu',
        'risk_owner'             => 'người chịu trách nhiệm',

        // Task
        'assigned_to'            => 'người thực hiện',
        'parent_task_id'         => 'công việc cha',
        'progress_percentage'    => 'tiến độ',

        // Material Bill
        'bill_number'            => 'số phiếu',
        'bill_date'              => 'ngày phiếu',
        'total_amount'           => 'tổng tiền',
        'unit_price'             => 'đơn giá',
        'total_price'            => 'thành tiền',

        // Subcontractor
        'phone'                  => 'số điện thoại',
        'email'                  => 'email',
        'company_name'           => 'tên công ty',
        'contact_person'         => 'người liên hệ',
        'contract_amount'        => 'giá trị HĐ NTP',
        'total_quote'            => 'giá trị báo giá',
        'subtotal'               => 'tổng phụ',
        'tax_amount'             => 'thuế',

        // Budget
        'budget_date'            => 'ngày ngân sách',
        'estimated_amount'       => 'dự toán',

        // Acceptance
        'order'                  => 'thứ tự',
        'acceptance_status'      => 'trạng thái nghiệm thu',
        'workflow_status'        => 'trạng thái quy trình',

        // Approval
        'rejected_reason'        => 'lý do từ chối',
        'rejection_reason'       => 'lý do từ chối',
        'approval_notes'         => 'ghi chú duyệt',

        // File
        'file'                   => 'tệp',
        'files'                  => 'tệp đính kèm',
        'attachments'            => 'tệp đính kèm',
        'file_path'              => 'đường dẫn tệp',
        'original_name'          => 'tên tệp gốc',

        // Auth
        'password'               => 'mật khẩu',
        'password_confirmation'  => 'xác nhận mật khẩu',

        // Supplier
        'address'                => 'địa chỉ',
        'tax_code'               => 'mã số thuế',

        // Equipment
        'equipment_name'         => 'tên thiết bị',
        'serial_number'          => 'số serial',
        'location'               => 'vị trí',

        // Material Quota
        'quota_quantity'         => 'định mức',
        'approved_quantity'      => 'số lượng duyệt',

        // Additional Cost
        'proposed_amount'        => 'số tiền đề xuất',
        'approved_amount'        => 'số tiền duyệt',

        // Global
        'content'                => 'nội dung',
        'type'                   => 'loại',
        'date'                   => 'ngày',
        'value'                  => 'giá trị',
        'code'                   => 'mã',
        'invoice_date'           => 'ngày hóa đơn',
        'global_subcontractor_id' => 'nhà thầu phụ',
    ],

];
