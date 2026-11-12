# NMA Serve Tools

NMA Serve Tools là bộ công cụ hỗ trợ giáo viên xử lý hồ sơ và chuẩn bị tệp để nhập vào hệ thống Cơ sở dữ liệu (CSDL) giáo dục. Dự án hướng đến việc giảm thời gian dành cho các thao tác lặp lại khi chuẩn bị tệp theo yêu cầu của hệ thống.

## Công cụ hiện có

- **Chuyển Word sang PDF hàng loạt.** Chọn tối đa 50 tệp `.docx` mỗi lượt, chuyển đổi bằng LibreOffice rồi tải các tệp PDF kết quả.
- **Tạo bản sao PDF đã biết mật khẩu.** Tải tệp PDF lên và nhập mật khẩu mở tệp để tạo một bản sao PDF không mã hóa.

## Cài đặt trên Windows

1. Cài **Node.js 22 trở lên** (kèm npm) và **LibreOffice**. Nếu dùng tính năng sao chép PDF có mật khẩu, cài thêm **Python 3** và chọn **Add python.exe to PATH** khi cài.
2. Tải mã nguồn về máy, giải nén nếu cần rồi mở PowerShell trong thư mục chứa `package.json`. Cài các gói của dự án:

   ```powershell
   npm.cmd ci
   ```

3. Nếu dùng tính năng sao chép PDF có mật khẩu, cài thư viện Python:

   ```powershell
   python -m pip install -r requirements.txt
   ```

4. Ứng dụng mặc định tìm LibreOffice tại `C:\Program Files\LibreOffice\program\soffice.exe`. Nếu cài ở thư mục khác, đặt `SOFFICE_BIN` theo đường dẫn thực tế trong cùng cửa sổ PowerShell:

   ```powershell
   $env:SOFFICE_BIN = 'D:\LibreOffice\program\soffice.exe'
   ```

   Nếu máy dùng lệnh `py` thay cho `python`, chạy `py -m pip install -r requirements.txt` ở bước 3 và đặt `$env:PYTHON_BIN = 'py'` trước khi khởi động.

5. Build và chạy ứng dụng:

   ```powershell
   npm.cmd run build
   npm.cmd start
   ```

## Cài đặt trên macOS

1. Cài **Node.js 22 trở lên** (kèm npm) và đưa **LibreOffice.app** vào thư mục **Applications**. Cài thêm **Python 3** nếu dùng tính năng sao chép PDF có mật khẩu.
2. Tải mã nguồn về máy, giải nén nếu cần rồi mở Terminal trong thư mục chứa `package.json`. Cài các gói của dự án:

   ```bash
   npm ci
   ```

3. Đặt đường dẫn tới LibreOffice. Nếu đặt ứng dụng ở thư mục khác, sửa đường dẫn cho phù hợp.

   ```bash
   export SOFFICE_BIN="/Applications/LibreOffice.app/Contents/MacOS/soffice"
   ```

4. Nếu dùng tính năng sao chép PDF có mật khẩu, tạo môi trường Python riêng cho dự án và cấu hình ứng dụng dùng Python trong môi trường đó:

   ```bash
   python3 -m venv .venv
   .venv/bin/python -m pip install -r requirements.txt
   export PYTHON_BIN="$PWD/.venv/bin/python"
   ```

5. Build và chạy ứng dụng trong cùng cửa sổ Terminal:

   ```bash
   npm run build
   npm start
   ```

## Sử dụng

1. Khi ứng dụng đã chạy, mở [http://localhost:3000](http://localhost:3000) trong trình duyệt.
2. Trong menu **PDF**, chọn **Convert** để chuyển Word sang PDF hoặc **Copy protected file** để tạo bản sao PDF có mật khẩu.
3. Chọn tệp cần xử lý. Có thể nhập đường dẫn thư mục đích trên máy đang chạy ứng dụng hoặc để trống và tải tệp từ trang kết quả.

Giữ cửa sổ PowerShell hoặc Terminal mở khi sử dụng. Nhấn `Ctrl+C` để dừng ứng dụng. Khi chạy lại trong cửa sổ mới, đặt lại các biến môi trường đã cấu hình trước khi chạy lệnh start.
