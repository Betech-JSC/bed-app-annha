# Hướng dẫn sử dụng ImagePicker Component

Component `ImagePicker` và `ImagePickerField` được tạo để hỗ trợ chụp/tải nhiều file ảnh lên hệ thống và lưu trữ đường dẫn ảnh vào JSON field.

## Components

### 1. ImagePicker
Component cơ bản để chọn/chụp ảnh và upload lên server.

### 2. ImagePickerField
Component wrapper cho ImagePicker, tự động xử lý việc convert giữa images array và JSON string.

## Cài đặt

Component đã được export trong `@/components`, bạn có thể import như sau:

```typescript
import { ImagePicker, ImagePickerField } from "@/components";
import { ImageItem } from "@/components";
import { jsonToImages, imagesToJson } from "@/utils/imageUtils";
```

## Sử dụng

### Cách 1: Sử dụng ImagePickerField (Khuyến nghị)

Sử dụng khi bạn cần lưu ảnh vào JSON field trong database:

```typescript
import { ImagePickerField } from "@/components";
import { useState } from "react";

function MyForm() {
  const [imagesJson, setImagesJson] = useState<string>("[]");

  return (
    <ImagePickerField
      label="Hình ảnh dự án"
      value={imagesJson}
      onChange={setImagesJson}
      maxImages={10}
      multiple={true}
      required={true}
    />
  );
}
```

### Cách 2: Sử dụng ImagePicker trực tiếp

Sử dụng khi bạn cần xử lý images array trực tiếp:

```typescript
import { ImagePicker, ImageItem } from "@/components";
import { useState } from "react";

function MyForm() {
  const [images, setImages] = useState<ImageItem[]>([]);

  const handleSave = async () => {
    // Convert images to JSON
    const jsonValue = imagesToJson(images);
    
    // Save to backend
    await api.post("/projects", {
      images: jsonValue, // JSON string
    });
  };

  return (
    <ImagePicker
      value={images}
      onChange={setImages}
      maxImages={10}
      multiple={true}
    />
  );
}
```

### Cách 3: Load từ JSON field

Khi load dữ liệu từ backend có JSON field chứa ảnh:

```typescript
import { jsonToImages } from "@/utils/imageUtils";

function MyScreen() {
  const [images, setImages] = useState<ImageItem[]>([]);

  useEffect(() => {
    // Load data from API
    const project = await api.get("/projects/1");
    
    // Parse JSON field to images array
    const loadedImages = jsonToImages(project.data.images);
    setImages(loadedImages);
  }, []);

  return <ImagePicker value={images} onChange={setImages} />;
}
```

## Props

### ImagePicker Props

| Prop | Type | Default | Mô tả |
|------|------|---------|-------|
| `value` | `ImageItem[]` | `[]` | Mảng ảnh hiện tại |
| `onChange` | `(images: ImageItem[]) => void` | - | Callback khi ảnh thay đổi |
| `maxImages` | `number` | `10` | Số lượng ảnh tối đa |
| `multiple` | `boolean` | `true` | Cho phép chọn nhiều ảnh |
| `disabled` | `boolean` | `false` | Vô hiệu hóa component |
| `showPreview` | `boolean` | `true` | Hiển thị preview khi click ảnh |

### ImagePickerField Props

| Prop | Type | Default | Mô tả |
|------|------|---------|-------|
| `label` | `string` | - | Nhãn hiển thị |
| `value` | `string \| null` | - | JSON string chứa mảng ảnh |
| `onChange` | `(jsonValue: string) => void` | - | Callback khi giá trị thay đổi |
| `maxImages` | `number` | `10` | Số lượng ảnh tối đa |
| `multiple` | `boolean` | `true` | Cho phép chọn nhiều ảnh |
| `disabled` | `boolean` | `false` | Vô hiệu hóa component |
| `required` | `boolean` | `false` | Đánh dấu bắt buộc |

## ImageItem Interface

```typescript
interface ImageItem {
  id?: string;
  url: string; // URL của ảnh
  attachment_id?: number; // ID attachment từ database
  localUri?: string; // URI local (trước khi upload)
  uploading?: boolean; // Đang upload
}
```

## Utility Functions

### imagesToJson(images: ImageItem[]): string
Convert mảng ảnh thành JSON string để lưu vào database.

### jsonToImages(jsonString: string | null | undefined): ImageItem[]
Parse JSON string thành mảng ảnh.

### imagesToUrls(images: ImageItem[]): string[]
Convert mảng ảnh thành mảng URLs (backward compatibility).

### urlsToImages(urls: string[]): ImageItem[]
Convert mảng URLs thành mảng ImageItem.

## Database Schema

Để lưu ảnh vào JSON field, bạn cần tạo migration:

```php
Schema::table('your_table', function (Blueprint $table) {
    $table->json('images')->nullable(); // Lưu mảng JSON
});
```

Hoặc nếu dùng MySQL:

```php
$table->text('images')->nullable(); // Lưu JSON string
```

## Ví dụ sử dụng trong các module

### Module Projects

```typescript
// Form tạo project
<ImagePickerField
  label="Hình ảnh dự án"
  value={formData.images}
  onChange={(json) => setFormData({ ...formData, images: json })}
  maxImages={20}
/>
```

### Module Acceptance Items

```typescript
// Form nghiệm thu
<ImagePickerField
  label="Hình ảnh nghiệm thu"
  value={item.images}
  onChange={(json) => updateItem({ ...item, images: json })}
  maxImages={10}
/>
```

### Module Construction Logs

```typescript
// Form nhật ký thi công
<ImagePickerField
  label="Hình ảnh công trường"
  value={log.images}
  onChange={(json) => setLog({ ...log, images: json })}
  maxImages={15}
/>
```

## Lưu ý

1. **Permissions**: Component tự động request quyền camera và media library
2. **Upload**: Ảnh được upload ngay khi chọn, không cần submit form
3. **Storage**: Ảnh được lưu trong `storage/uploads/YYYY/MM/DD/`
4. **Backend API**: Endpoint `/api/upload` trả về `attachment_id` và `file_url`
5. **JSON Format**: Format JSON lưu trong database:
   ```json
   [
     {
       "url": "http://example.com/storage/uploads/2025/12/23/abc123.jpg",
       "attachment_id": 123,
       "id": "123"
     }
   ]
   ```

## Troubleshooting

### Lỗi upload
- Kiểm tra quyền truy cập camera/media library
- Kiểm tra kết nối mạng
- Kiểm tra backend API `/api/upload` có hoạt động

### Ảnh không hiển thị
- Kiểm tra URL ảnh có đúng không
- Kiểm tra CORS settings trên backend
- Kiểm tra storage path có đúng không

### JSON parse error
- Đảm bảo JSON string hợp lệ
- Sử dụng `jsonToImages()` để parse an toàn
- Kiểm tra format JSON trong database

