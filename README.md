# OCEAN AI - CRM Tư vấn Đầu tư FDI

Hệ thống CRM quản lý tư vấn đầu tư nước ngoài (FDI) vào Việt Nam.

## Tính năng

- **Dashboard** - Tổng quan KPI, thống kê khách hàng, hợp đồng, hồ sơ
- **Quản lý Khách hàng** - Thông tin doanh nghiệp FDI, quốc gia, ngành nghề, vốn đầu tư
- **Quản lý Hợp đồng** - Theo dõi hợp đồng, giá trị, trạng thái thanh toán
- **Quản lý Hồ sơ/Giấy phép** - IRC, ERC, GP con, công bố thực phẩm/mỹ phẩm
- **Tài chính** - Theo dõi thanh toán, công nợ
- **Tìm kiếm** - Tìm kiếm toàn hệ thống

## Công nghệ

- Backend: Node.js + Express
- Database: SQLite (better-sqlite3)
- Frontend: HTML/CSS/JS (Single Page Application)

## Cài đặt local

```bash
npm install
npm start
```

Mở trình duyệt: http://localhost:3000

## Deploy lên Railway

1. Push code lên GitHub
2. Đăng nhập https://railway.com bằng GitHub
3. New Project → Deploy from GitHub Repo → chọn repo này
4. Thêm Volume: mount path `/data`
5. Thêm biến môi trường: `DB_PATH=/data/crm.db`

Chi tiết xem file `HUONG_DAN_DEPLOY_RAILWAY.md`
