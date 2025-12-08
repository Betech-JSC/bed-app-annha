# Hướng dẫn cài đặt Ant Design Vue

## Vấn đề

Nếu gặp lỗi `Failed to resolve import "ant-design-vue"`, có nghĩa là package chưa được cài đặt.

## Giải pháp

### Cách 1: Sửa lỗi Node.js (Khuyến nghị)

Lỗi `Library not loaded: /opt/homebrew/opt/icu4c/lib/libicui18n.74.dylib` là do thiếu thư viện icu4c.

**Trên macOS với Homebrew:**

```bash
# Cài đặt icu4c
brew install icu4c

# Hoặc nếu đã có nhưng version khác
brew link --overwrite icu4c
```

Sau đó cài đặt packages:

```bash
cd /Users/toannguyen/Projects/skysend/be
npm install
# hoặc
yarn install
```

### Cách 2: Sử dụng Node Version Manager

Nếu vẫn gặp vấn đề, có thể cài lại Node.js:

```bash
# Với nvm
nvm install 20
nvm use 20

# Sau đó cài đặt packages
npm install
```

### Cách 3: Cài đặt thủ công

Nếu không thể chạy npm/yarn, bạn có thể:

1. Thêm vào `package.json` (đã có sẵn):
```json
"dependencies": {
  "ant-design-vue": "^4.2.1",
  "@ant-design/icons-vue": "^7.0.1"
}
```

2. Chạy lệnh cài đặt trên máy khác hoặc sau khi fix Node.js:
```bash
npm install ant-design-vue@4.2.1 @ant-design/icons-vue@7.0.1
```

## Kiểm tra cài đặt

Sau khi cài đặt thành công, kiểm tra:

```bash
ls node_modules/ant-design-vue
ls node_modules/@ant-design/icons-vue
```

Nếu thấy các thư mục này, nghĩa là đã cài đặt thành công.

## Build assets

Sau khi cài đặt xong:

```bash
npm run dev
# hoặc
yarn dev
```

## Lưu ý

- `package.json` đã được cập nhật với dependencies cần thiết
- `app.js` đã được cấu hình để import Ant Design
- Tất cả Admin pages đã được cập nhật để sử dụng Ant Design components

