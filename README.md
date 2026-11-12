# NMA Serve Tools

NMA Serve Tools là bộ công cụ giúp giáo viên xử lý tệp và chuẩn bị dữ liệu cho hệ thống CSDL giáo dục. Backend NestJS nằm trong `backend/` và cung cấp API. Frontend SvelteKit dùng Svelte 5 nằm trong `frontend/`.

## Yêu cầu

- Node.js 22 trở lên
- LibreOffice để chuyển DOCX sang PDF. Đặt `SOFFICE_BIN` nếu lệnh `soffice` không nằm trong PATH trên macOS/Linux hoặc LibreOffice dùng đường dẫn cài đặt khác trên Windows.
- Python 3 và các gói trong `backend/requirements.txt` nếu dùng tính năng sao chép PDF có mật khẩu

## Cài đặt

Tại thư mục gốc dự án, cài công cụ chạy chung:

```bash
npm install
```

## Chạy frontend và backend

Chỉ cần chạy một lệnh:

```bash
npm run start:dev
```

Lệnh này tự cài dependencies cho cả hai phần, sau đó chạy NestJS backend tại `http://localhost:3000` và SvelteKit frontend tại `http://localhost:5173`. Mở địa chỉ frontend trong trình duyệt.

Để build production:

```bash
npm run build
```

## Công cụ hiện có

- **Lịch báo giảng**: tải lịch tuần cũ và tuần mới, chọn đổi tên môn theo danh sách môn của tệp, cập nhật PPCT rồi tải Excel.
- **Thư tháng**: chọn mẫu Word có trường MERGEFIELD và danh sách Excel, chọn cột đặt tên PDF, rồi tải ZIP. Dùng trang tính đầu tiên với tiêu đề cột ở dòng đầu, tối đa 250 dòng dữ liệu.
- **Chuyển DOCX sang PDF**: tải tối đa 50 file DOCX, chuyển đổi bằng LibreOffice và tải từng PDF.
- **Sao chép PDF có mật khẩu**: nhập mật khẩu mở file để tạo bản sao PDF không mã hóa.

## Python cho PDF có mật khẩu

```bash
python -m pip install -r backend/requirements.txt
```

Trên macOS có thể dùng `python3` thay cho `python`.
