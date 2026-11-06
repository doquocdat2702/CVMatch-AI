# Thiết kế giao diện — Tuyển dụng DMatch

Chốt ở T27. Từ T28 trở đi mọi màn hình tuân theo tài liệu này và **chỉ dùng biến trong
`src/styles/variables.css`**, không tự đặt màu, cỡ chữ, khoảng cách riêng.

## 1. Hướng tổng thể: "Tờ hồ sơ, mực bút bi xanh"

- Người dùng chính: HR nội bộ (bảng đơn ứng tuyển, ma trận yêu cầu – bằng chứng, form tin tuyển dụng).
  Sau đó là ứng viên và quản trị viên.
- Việc chính của giao diện: đọc bảng và điền form nhanh, không nhầm trạng thái.
- Mỗi trang như một tờ hồ sơ: nền giấy trắng, chữ mực đen, điểm nhấn bằng màu mực bút bi xanh.
  Badge trạng thái giống nhãn đóng trên hồ sơ.
- Công cụ nội bộ: tối giản, không hero trên trang quản trị. Chỉ trang đăng nhập và trang việc làm
  công khai được có khối điểm nhấn.
- Phía ứng viên (T35f): khối mở đầu Xanh mực ở trang chủ là "bìa hồ sơ", bên dưới là các tờ Giấy viền mảnh
  (thẻ tin, khối nội dung) đặt trên nền Nền. Điểm nhấn duy nhất là tên công ty serif cỡ lớn, phần còn lại giữ yên.

## 2. Màu

| Tên | Hex | Biến | Dùng cho |
|---|---|---|---|
| Xanh mực | `#0B63CE` | `--color-primary` | Nút chính, link, viền focus, khối điểm nhấn |
| Xanh mực đậm | `#084C9E` | `--color-primary-hover` | Nút chính khi hover |
| Xanh nhạt | `#E8F1FC` | `--color-primary-soft` | Nền menu đang chọn, trang hiện tại của pagination |
| Chữ trên Xanh nhạt | `#0A4FA0` | `--color-primary-soft-text` | Chữ đặt trên nền Xanh nhạt |
| Mực đen | `#14202E` | `--color-text` | Chữ chính |
| Chì | `#52606F` | `--color-text-muted` | Chữ phụ, chú thích, gợi ý dưới ô nhập |
| Giấy | `#FFFFFF` | `--color-surface` | Header, vùng nội dung, bảng, form |
| Nền | `#F4F7FB` | `--color-bg` | Sidebar, hàng tiêu đề bảng, nền trang công khai |
| Viền | `#DDE4EE` | `--color-border` | Đường kẻ bảng, khung |
| Viền đậm | `#8592A3` | `--color-border-strong` | Viền ô nhập, viền nút phụ |

Màu dẫn xuất (không dùng làm màu nhấn):

| Hex | Biến | Dùng cho |
|---|---|---|
| `#E9EFF6` | `--color-hover` | Nền khi hover: nút phụ, mục sidebar, nút pagination |
| `#EEF2F7` / `#7D8A9A` | `--color-disabled-bg` / `--color-disabled-text` | Trạng thái disabled |
| `#84201A` | `--color-danger-hover` | Nút nguy hiểm khi hover |
| `rgba(20, 32, 46, 0.45)` | `--color-overlay` | Lớp phủ sau modal |

### Badge trạng thái (chữ / nền / viền)

| Nhóm | Chữ | Nền | Viền | Status |
|---|---|---|---|---|
| Xanh lá | `#1F6B3A` | `#E5F3E9` | `#B9DCC4` | SUPPORTED, COMPLETED, ACCEPTED |
| Vàng | `#7A5300` | `#FBF1D6` | `#EBD39A` | UNCERTAIN, REVIEWING, PROCESSING |
| Đỏ | `#A3261E` | `#FBE7E5` | `#F0BDB8` | NOT_FOUND, FAILED, REJECTED |
| Xám xanh | `#435266` | `#EDF1F6` | `#D3DBE6` | Còn lại (APPLIED, UPLOADED, REQUIRED...) |

Màu đỏ của badge cũng là màu lỗi form (`--color-danger-*`).

### Kết quả kiểm độ tương phản (WCAG 2.1 AA)

Chữ thường cần ≥ 4.5:1. Viền ô nhập và viền focus (thành phần giao diện) cần ≥ 3:1.

| Cặp màu | Tỉ lệ | Kết quả |
|---|---|---|
| Chữ trắng trên Xanh mực (nút chính, khối đăng nhập) | 5.69:1 | Đạt |
| Chữ trắng trên Xanh mực đậm (nút chính hover) | 8.27:1 | Đạt |
| Link Xanh mực trên Giấy | 5.69:1 | Đạt |
| Link Xanh mực trên Nền | 5.30:1 | Đạt |
| `#0A4FA0` trên Xanh nhạt (menu đang chọn) | 6.98:1 | Đạt |
| Mực đen trên Giấy | 16.46:1 | Đạt |
| Mực đen trên Nền | 15.32:1 | Đạt |
| Mực đen trên nền hover | 14.22:1 | Đạt |
| Chì trên Giấy | 6.44:1 | Đạt |
| Chì trên Nền | 5.99:1 | Đạt |
| Viền đậm (ô nhập) trên Giấy | 3.16:1 | Đạt (≥ 3) |
| Viền focus Xanh mực trên Giấy / Nền / Xanh nhạt | 5.69 / 5.30 / 4.99:1 | Đạt (≥ 3) |
| Badge xanh lá | 5.69:1 | Đạt |
| Badge vàng | 6.09:1 | Đạt |
| Badge đỏ | 6.19:1 | Đạt |
| Badge xám xanh | 7.02:1 | Đạt |
| Chữ lỗi và viền ô lỗi Đỏ trên Giấy | 7.36:1 | Đạt |
| Chữ trắng trên nút danger / khi hover | 7.36 / 9.53:1 | Đạt |
| Chữ phụ Xanh nhạt trên Xanh mực (khối đăng nhập; câu dẫn + số vị trí ở khối mở đầu trang chủ, T35f) | 4.99:1 | Đạt |
| Tên công ty trắng trên Xanh mực (khối mở đầu, T35f) | 5.69:1 | Đạt |
| Dải tìm kiếm Giấy trên Xanh mực (khung của ô nhập, T35f) | 5.69:1 | Đạt (≥ 3) |
| Gợi ý trong ô tìm, tóm tắt và ngày đăng trên thẻ (Chì trên Giấy, T35f) | 6.44:1 | Đạt |
| Vạch ngăn 2 ô tìm, viền trên thanh ứng tuyển dính đáy (Viền đậm trên Giấy, T35f) | 3.16:1 | Đạt (≥ 3) |
| Dòng nhắc tải CV, nhãn "CV hiện tại" (`#0A4FA0` trên Xanh nhạt, T35f) | 6.98:1 | Đạt |
| Mô tả trang, dấu "/" của breadcrumb (Chì trên Nền, T35f) | 5.99:1 | Đạt |
| Breadcrumb "Việc làm", viền thẻ khi rê chuột (Xanh mực trên Nền, T35f) | 5.30:1 | Đạt |
| Chữ disabled trên nền disabled | 3.13:1 | WCAG miễn cho thành phần bị vô hiệu |

## 3. Font

2 font tự host trong `public/fonts/` (file `.woff2`, bộ ký tự latin + vietnamese), khai báo `@font-face`
trong `src/styles/fonts.css` với `font-display: swap`. Giấy phép SIL OFL 1.1 của 2 font nằm cùng thư mục.

| Font | Độ đậm | Biến | Dùng cho |
|---|---|---|---|
| Be Vietnam Pro | 400, 500, 600 | `--font-sans` | Toàn bộ giao diện: menu, bảng, form, nút, đoạn văn |
| Source Serif 4 | 600 | `--font-serif` | Chỉ tiêu đề trang (h1) và khối điểm nhấn |

Be Vietnam Pro do người Việt thiết kế cho tiếng Việt, dấu chồng (ẩ, ỗ, ừ) rõ ở cỡ 12–14px trong bảng.
Source Serif 4 tạo cảm giác "tiêu đề hồ sơ", không dùng cho đoạn văn hay bảng.

Vì sao tự host thay vì nạp từ Google Fonts:
- App và bản in CV chạy được khi không có mạng (máy demo, mạng nội bộ công ty chặn Google): font nằm cùng
  server với app, không phụ thuộc dịch vụ ngoài.
- Tránh vỡ dấu tiếng Việt: khi font không tải được, trình duyệt dùng font dự phòng. Georgia thiếu ký tự có dấu
  nên "Học vấn" hiện thành "Học vâ´n". Vì vậy font dự phòng chỉ giữ loại đủ dấu tiếng Việt:
  `--font-sans: 'Be Vietnam Pro', Arial, sans-serif` và `--font-serif: 'Source Serif 4', 'Times New Roman', serif`.

## 4. Thang cỡ chữ

Theo thang cổ điển 12 – 14 – 16 – 18 – 21 – 24 – 36.

| Biến cỡ / dòng | Cỡ / dòng | Dùng cho |
|---|---|---|
| `--text-xs` / `--leading-xs` | 12 / 18 | Badge, chú thích, lỗi dưới ô nhập |
| `--text-sm` / `--leading-sm` | 14 / 21 | Bảng, nhãn form, menu, nút |
| `--text-md` / `--leading-md` | 16 / 26 | Đoạn văn, ô nhập (16px để điện thoại không tự zoom) |
| `--text-lg` / `--leading-lg` | 18 / 27 | Tiêu đề mục (h2), tiêu đề modal |
| `--text-xl` / `--leading-xl` | 21 / 30 | Số liệu ở trang Tổng quan |
| `--text-2xl` / `--leading-2xl` | 24 / 32 | Tiêu đề trang h1 (serif) |
| `--text-3xl` / `--leading-3xl` | 36 / 44 | Chỉ khối điểm nhấn: trang đăng nhập, việc làm công khai; tên tin ở trang chi tiết tin (T35f) |
| `--text-4xl` / `--leading-4xl` | 48 / 64 | Chỉ tên công ty ở khối mở đầu trang chủ trên máy tính (T35f); dưới 900px dùng 36 / 44 |

- Độ dài dòng của đoạn văn dài (nội dung JD, T35f): `--text-measure` 36rem, khoảng 70 ký tự tiếng Việt ở 16px.
  Không dùng đơn vị `ch`: chữ số "0" của Be Vietnam Pro rộng 10,8px nên 70ch thành khoảng 90 ký tự một dòng.

- Dòng của tiêu đề không thấp hơn 1.3 để dấu tiếng Việt không bị cắt.
- Độ đậm: `--weight-regular` 400 chữ thường, `--weight-medium` 500 menu và nút,
  `--weight-semibold` 600 tiêu đề, nhãn, tiêu đề cột.
- Không viết hoa toàn bộ cho nhãn hay tiêu đề cột. Ngoại lệ đã duyệt (T35e): tên công ty và thanh dưới của footer.
- `h1` và `h2` đã có style chung trong `index.css`: trang chỉ cần dùng thẻ, không tự đặt cỡ chữ.

## 5. Khoảng cách, bo góc, bóng

| Biến | Giá trị | Biến | Giá trị |
|---|---|---|---|
| `--space-1` | 4px | `--space-5` | 24px |
| `--space-2` | 8px | `--space-6` | 32px |
| `--space-3` | 12px | `--space-7` | 48px |
| `--space-4` | 16px | `--space-8` | 64px |

- Nhãn → ô nhập: `--space-2`. Giữa các ô: `--space-4`. Giữa các mục: `--space-6`.
- Ô trong bảng: `--space-3` dọc, `--space-4` ngang.
- Lề vùng nội dung: `--space-6` trên máy tính, `--space-4` trên điện thoại.
- Bo góc: `--radius-sm` 4px cho nút, ô nhập, badge, pagination; `--radius-md` 8px cho khung bảng và modal.
  Không dùng kiểu bo tròn viên thuốc.
- Bóng: chỉ modal có bóng (`--shadow-modal`). Không bọc nội dung trong card đổ bóng
  (dropdown thông báo, menu tài khoản, footer cũng chỉ có viền).
- Biến thêm ở T35f: `--control-height-lg` 48px (ô tìm kiếm và nút Tìm ở khối mở đầu), `--touch-target` 44px
  (vùng bấm tối thiểu dưới 900px ở bố cục khách và ứng viên), `--aside-width` 320px (khung ứng tuyển dính),
  `--duration-pulse` 1200ms (nhịp mờ - rõ của khung xương khi đang tải).

## 6. Bố cục

```
┌────────────────────────────────────────────────────────────────┐
│ Tuyển dụng DMatch                   hr@congty.vn   [Đăng xuất] │  Header 56px, nền Giấy
├────────────────┬───────────────────────────────────────────────┤
│  Hồ sơ         │  Tin tuyển dụng (serif 24)        [Tạo tin]   │
│  Công ty       │                                               │
│ ▌Tin tuyển dụng│  ┌──────────────────────────────────────────┐ │
│  Đơn ứng tuyển │  │ Vị trí          Trạng thái    Ngày tạo   │ │
│                │  ├──────────────────────────────────────────┤ │
│ Sidebar 232px  │  │ Kế toán tổng hợp [Đang mở]   10/10/2026  │ │
│ nền Nền        │  └──────────────────────────────────────────┘ │
│                │                         Trước  1 [2] 3  Sau   │
└────────────────┴───────────────────────────────────────────────┘
```

- `MainLayout` = `Header` + `Sidebar` + vùng nội dung, **chỉ cho nhà tuyển dụng và quản trị viên** (từ T35d).
  Header bắt đầu bằng Logo (T35e) thay cho tên hệ thống dạng chữ; nút Đăng xuất về `/` (bố cục khách).
  Nội dung căn trái, rộng tối đa `--content-max` 1200px; form rộng tối đa `--form-max` 640px.
- Phân tách các phần bằng tiêu đề và khoảng trắng, không bằng card.
- Menu đang chọn: nền Xanh nhạt, chữ `#0A4FA0` đậm 600, vạch trái 3px Xanh mực
  (vạch giúp nhận ra mục đang chọn mà không cần phân biệt màu).
- Dưới 900px: sidebar thành hàng menu nằm dưới header, tự xuống dòng; không cuộn ngang trang.
- Media query không dùng được biến CSS, nên 2 mốc cố định là **900px** (bố cục) và **768px** (form 2 cột).
  Lưới thẻ tin (trang chủ, tab Gợi ý; T35f thay cho lưới 3 cột của T31): 1 cột đến 900px, 2 cột từ 901px.
  Mục "Vị trí khác đang tuyển" ở trang chi tiết tin: 3 cột từ 901px.
- Tương tự, `@page` (bản in CV, T29b) ghi số trực tiếp: khổ A4, lề 15mm, khớp `--print-page-width` và
  `--print-page-margin` trong variables.css.

### SiteLayout: khách và ứng viên (T35d, T35e)

```
┌────────────────────────────────────────────────────────────────────┐
│ [T] Tuyển dụng DMatch  Việc làm  Giới thiệu  Liên hệ  [chuông] (Á) Ánh ▾ │  khách: Đăng nhập [Đăng ký]
│                        ━━━━━━━━                                    │  gạch chân 2px đè viền header
├────────────────────────────────────────────────────────────────────┤
│            Việc làm (serif 24)                                      │
│            Tất cả (24)    Gợi ý theo CV của bạn (6)                 │  tab chỉ ứng viên thấy
│            ━━━━━━━━━━                                               │
│            nội dung căn giữa, rộng tối đa --content-max  (flex: 1)  │
├────────────────────────────────────────────────────────────────────┤
│ [T] Tuyển dụng DMatch                                     Việc làm  │  SiteFooter (T35e)
│ CÔNG TY CỔ PHẦN ...                                     Giới thiệu  │
│ (vị trí) địa chỉ  (đt) số điện thoại  (thư) email          Liên hệ  │
│ website · Theo dõi chúng tôi Facebook YouTube    Đăng ký ứng tuyển  │
│ ──────────────────────────────────────────────────────────────────  │
│ © 2026 CÔNG TY ... | CHÍNH SÁCH BẢO MẬT | ĐIỀU KHOẢN SỬ DỤNG        │
└────────────────────────────────────────────────────────────────────┘
```

- `SiteLayout` thay `PublicLayout` (đã xóa ở T35e) cho khách và thay `MainLayout` cho ứng viên: menu ngang,
  không Sidebar. Thanh header rộng bằng vùng nội dung cộng lề hai bên (`--content-max` + 2 × `--space-6`) nên Logo
  thẳng mép trái nội dung. Không thêm biến độ rộng mới (dùng `--content-max` có sẵn).
- Khung cột `min-height: 100vh`, vùng nội dung `flex: 1`: trang ít nội dung thì footer vẫn sát đáy màn hình.
- Từ T35f vùng nội dung có nền Nền (header, footer vẫn Giấy) để tờ Giấy viền mảnh nổi lên. Khung có
  `overflow-x: clip` (không phải hidden, để `position: sticky` bên trong vẫn chạy) cho khối mở đầu tràn hết bề ngang.
- Viền focus mặc định cho mọi phần tử bấm được chưa tự đặt (T35f), viết trong `:where()` để độ ưu tiên thấp nhất:
  viền focus riêng của component vẫn thắng.
- Dưới 900px (T35f): nút, ô nhập, ô chọn trong nội dung, chuông và nút tài khoản, Đăng nhập / Đăng ký, hàng menu,
  link chân trang cao tối thiểu `--touch-target` 44px. Chuông và nút tài khoản dùng chung với Header của HR nên
  chỉ phóng to trong SiteLayout. Modal gắn vào body (ngoài SiteLayout) nên hộp ứng tuyển tự đặt 44px cho nút của nó.
- Lưới 3 cột `1fr auto 1fr`: Logo | menu chính đúng giữa | bên phải.
- Menu chính: chữ 14px đậm 500, mục khác màu Chì, mục đang ở chữ Mực đen + gạch chân 2px Xanh mực
  (`calc(var(--border-width) * 2)`, không thêm biến) đè lên viền dưới của header. Dùng `NavLink` (tự gắn `aria-current="page"`).
  "Việc làm" vẫn gạch chân ở `/jobs/:id` và `/candidate/recommended-jobs/:jobId` (thuộc mục này), nhưng
  `aria-current` chỉ gắn ở đúng `/`.
- Bên phải: khách có "Đăng nhập" (link chữ Xanh mực) + "Đăng ký" (link dạng nút chính cỡ nhỏ), cả hai gửi kèm
  trang đang xem để đăng nhập xong quay lại. Ứng viên có `NotificationBell` + `AccountMenu`.
- Dưới 900px (T35e, thay nút "Menu" và panel dọc của T35d): header 2 hàng.
  Hàng 1 cao `--header-height`: Logo bên trái; bên phải chuông + AccountMenu (ứng viên) hoặc "Đăng nhập" + "Đăng ký"
  (khách). Hàng 2 cao `--control-height`: Việc làm / Giới thiệu / Liên hệ nằm ngang, căn trái theo Logo, giữ gạch
  chân 2px đè viền dưới header. Nút tài khoản chỉ còn ô chữ cái + dấu ▾; dưới 768px Logo chỉ còn ô chữ.
- Đăng xuất (AccountMenu, Header của MainLayout) về trang chủ `/` ở bố cục khách, không mang theo trang cũ.
- Trang đăng nhập, đăng ký, quên / đặt lại mật khẩu giữ bố cục riêng, không dùng SiteLayout.
  Trang đăng nhập có Logo ở đầu cột form (T35e), khối Xanh mực giữ tên hệ thống cỡ lớn.

### Trang chủ `/` (T35f)

```
┌──────────────────────────────── header ────────────────────────────────┐
│████████████████████ nền Xanh mực đặc, tràn hết bề ngang █████████████████│
│ Cơ hội nghề nghiệp tại                          (18px đậm 500, Xanh nhạt) │
│ Công ty TNHH ABC                                  (serif 48px, chữ trắng) │
│ 29 vị trí đang tuyển                                         (Xanh nhạt) │
│ ┌ dải Giấy ─────────────────────────────────────────────────────────────┐ │
│ │ Tên vị trí, ví dụ: Kế toán        │ Địa điểm, ví dụ: Hà Nội   [ Tìm ] │ │
│ └───────────────────────────────────────────────────────────────────────┘ │
│███████████████████████████████████████████████████████████████████████████│
│ Tất cả (29)   Gợi ý theo CV của bạn (17)          (khách: h2 "Vị trí đang tuyển") │
│ Tải CV để ứng tuyển nhanh và xem gợi ý việc làm theo hồ sơ. Tải CV lên   │ chỉ ứng viên chưa có CV phân tích
│ ┌ thẻ Giấy ────────────────────┐ ┌──────────────────────────────┐         │
│ │ Kế toán tổng hợp (serif 18)  │ │ ...                          │         │ 2 cột từ 901px
│ │ Hà Nội                       │ │                              │         │
│ │ Tóm tắt JD 2 dòng...         │ │                              │         │
│ │ Đăng 3 ngày trước  [Đã ứng tuyển] │                          │         │
│ └──────────────────────────────┘ └──────────────────────────────┘         │
```

- Khối mở đầu dùng chung cho khách và ứng viên, chữ căn trái thẳng mép nội dung. Tràn hết bề ngang bằng margin âm
  `calc(50% - 50vw)` và padding bù lại; sát header bằng margin âm đúng bằng lề vùng nội dung của SiteLayout.
  HR / Admin vào "/" (MainLayout có Sidebar) thì khối nằm gọn trong vùng nội dung, bo 8px.
- h1 gồm câu dẫn + tên công ty (`GET /company/public`, lỗi thì tên hệ thống); đang tải thì giữ chỗ để chữ không nhảy.
  "N vị trí đang tuyển": tổng số tin đang mở, không theo bộ lọc.
- Tìm kiếm: 2 ô (tên vị trí, địa điểm) + nút Tìm trong một dải Giấy, dải là khung của ô (ô không viền riêng, viền
  focus vẽ vào trong). Dùng đúng tham số `keyword` (lọc theo tiêu đề) và `location` của `GET /jobs`, nằm trên URL
  (`?keyword=&location=`). Tìm thì về tab Tất cả, trang 1; sang tab Gợi ý thì bỏ bộ lọc. Dưới 900px 2 ô và nút xếp dọc.
- Đang lọc: dòng "3 vị trí khớp với “kế toán” tại “Hà Nội”" + nút ghost "Xóa bộ lọc". Không có kết quả: khối rỗng
  "Không có vị trí nào khớp với ..." + "Thử tên vị trí ngắn hơn hoặc bỏ địa điểm." + nút "Xóa bộ lọc".
- Thẻ tin (`JobCard`): tiêu đề serif 18px, địa điểm 14px đậm 500, đoạn đầu JD 2 dòng (`line-clamp`, Chì),
  "Đăng hôm nay / hôm qua / X ngày trước / ngày dd/mm/yyyy" 12px Chì, Badge "Đã ứng tuyển" ở chân thẻ.
  Một link duy nhất ở tiêu đề phủ kín thẻ bằng `::after`; viền focus vẽ trên lớp phủ (bao cả thẻ).
  Rê chuột: viền Xanh mực, không bóng, chuyển 150ms (`--duration-base`). Công ty không lặp lại trên thẻ (một công ty).
- Đang tải: khung xương (`JobCardSkeleton`) cùng lưới và cỡ với thẻ thật, thanh `--color-hover` mờ - rõ chậm;
  `prefers-reduced-motion` thì đứng yên. Trình đọc màn hình đọc câu ẩn "Đang tải việc làm...".
- Mỗi trang 10 thẻ (`CARD_PAGE_SIZE`, 5 hàng của lưới 2 cột); bảng của HR giữ 9 dòng (`PAGE_SIZE`).
  Đổi trang thì cuộn tới đầu danh sách, không cuộn lên tận khối mở đầu.

### Chi tiết tin `/jobs/:id` (T35f)

```
Việc làm / Kế toán tổng hợp                                   (breadcrumb, tên tin dài thì cắt "...")
┌ tờ Giấy ─────────────────────────────────────┐  ┌ khung dính (sticky) ──────┐
│ Kế toán tổng hợp (serif 36)                  │  │ [     Ứng tuyển ngay     ] │  hoặc Đã ứng tuyển / Tin đã đóng
│ Công ty · Hà Nội · Đăng 11 ngày trước        │  └───────────────────────────┘
├──────────────────────────────────────────────┤  ┌───────────────────────────┐
│ Mô tả công việc (h2)                         │  │ Đối chiếu với hồ sơ của bạn│  chỉ ứng viên có CV phân tích
│ • ...            (dòng tối đa ~70 ký tự)     │  │ 4/7 yêu cầu có bằng chứng  │
│ Yêu cầu ứng viên / Ưu tiên / Quyền lợi       │  │ [=====-----] note của API  │
└──────────────────────────────────────────────┘  │ Xem chi tiết đối chiếu     │
Vị trí khác đang tuyển: 3 thẻ                       └───────────────────────────┘
```

- Máy tính: lưới `minmax(0, 1fr) var(--aside-width)`; đầu tin + JD ghép thành một tờ Giấy (đường kẻ ngăn giữa),
  khung bên phải `position: sticky; top: var(--space-6)`. HR / Admin không có khung bên phải, tin rộng hết vùng nội dung.
- JD (`utils/jobText.js`): dòng ngắn (≤ 60 ký tự) bắt đầu bằng "Mô tả", "Yêu cầu", "Ưu tiên", "Quyền lợi"...
  hoặc kết thúc bằng ":" là tiêu đề phần (h2); dòng kết thúc bằng dấu câu là câu văn. Tiêu đề viết hoa toàn bộ
  đổi về viết thường. Dòng "- ", "• ", "+ " thành danh sách; JD không có tiêu đề nào thì nằm dưới "Mô tả công việc".
- Coverage (chỉ ứng viên đã có CV phân tích xong, API đối chiếu chỉ đọc DB, không gọi Gemini): `CoverageBar`
  "x/y yêu cầu có bằng chứng (z%)" + thanh trung tính + note; tin chưa có yêu cầu thì "Tin chưa có yêu cầu để đối chiếu."
- "Vị trí khác đang tuyển": 4 tin mới nhất của `GET /jobs`, bỏ tin đang xem, lấy 3. Bấm thẻ là mount lại trang
  (route có key theo mã tin) và cuộn về đầu.
- Dưới 900px 1 cột theo thứ tự: đầu tin, khung đối chiếu, JD, khung ứng tuyển. Khung ứng tuyển là thanh dính đáy
  (`position: sticky; bottom: 0`, nền Giấy, viền trên Viền đậm, tràn hết bề ngang, nút rộng hết thanh): dính ở đáy
  khi đang đọc, cuộn hết tin thì về đúng chỗ dưới JD nên không che phần cuối trang. Dòng thông tin mỗi mục một dòng.
- Khách: "Ứng tuyển ngay" + câu "Đăng nhập để gửi CV và theo dõi đơn ứng tuyển." (ẩn trên thanh dính đáy).
  Ứng viên: `ApplyAction variant="panel"` (nút rộng hết khung; trạng thái đơn và "Xem đơn" chung một dòng).

### Trang của ứng viên: CV của tôi, Hồ sơ, Đơn ứng tuyển, Đổi mật khẩu (T35f)

- Đầu trang `PageHeader`: h1 serif + một câu mô tả màu Chì, nút phụ (nếu có) bên phải.
- Nội dung trong tờ Giấy viền mảnh (`Panel`; Hồ sơ, Đổi mật khẩu rộng bằng form), mỗi mục một khối, cách `--space-5`.
- CV của tôi: khối "Tải CV lên" (vùng kéo thả giữ nguyên) rồi danh sách thẻ CV: tên file, ngày tải, nhãn "CV hiện tại",
  Badge trạng thái; hàng thao tác Xem, Phân tích CV / Phân tích lại, Xem kết quả và Xuất CV mới (chỉ thẻ CV hiện tại,
  vì kết quả phân tích là hồ sơ chung), Xóa tách riêng bên phải. Đầu trang có link "Kết quả phân tích CV".
- Đơn ứng tuyển: thanh trên (CV nhà tuyển dụng xem được + ô lọc trạng thái) rồi danh sách thẻ đơn thay cho bảng:
  tên tin (serif, link về tin), "Nộp ngày dd/mm/yyyy (X ngày trước)", Badge, tiến trình 3 bước, "Lúc nộp: z% yêu cầu
  có bằng chứng"; Xem ma trận, Chi tiết đối chiếu bên trái, Rút đơn (chỉ khi Đã nộp) bên phải.
- Trạng thái rỗng: một câu + một hành động chính ("Bạn chưa ứng tuyển vị trí nào." + "Xem việc làm";
  "Bạn chưa có CV nào." + "Tải CV lên"; lọc ra rỗng: "Không có đơn nào ở trạng thái này." + "Xem tất cả đơn").
- Đổi mật khẩu: route của ứng viên truyền `siteStyle` cho trang dùng chung; HR / Admin giữ bố cục cũ (h1 + form).
- Tiêu đề tab trình duyệt (`useDocumentTitle`): "<tên trang> | <VITE_APP_NAME>" ở trang chủ, chi tiết tin (tên tin),
  chi tiết đối chiếu, các trang ứng viên, trang công khai và trang đăng nhập / đăng ký. Rời trang thì về tên hệ thống,
  nên trang HR / Admin (chưa đặt tiêu đề riêng) chỉ hiện tên hệ thống.

### Footer của SiteLayout (`SiteFooter`, T35e)

- Chỉ có ở SiteLayout (khách, ứng viên); HR / Admin dùng MainLayout nên không có footer.
- Nền Giấy, viền trên Viền, không đổ bóng. Rộng và lề bằng thanh header.
- Máy tính 2 cột. Trái: Logo; tên công ty viết hoa (`text-transform`, 14px đậm 600, Mực đen); địa chỉ, điện thoại
  (`tel:` bỏ khoảng trắng), email (`mailto:`) mỗi dòng có icon 16px; website công ty (tab mới); "Theo dõi chúng tôi"
  + link chữ Facebook / YouTube (tab mới, `rel="noopener noreferrer"`). Phải: `<nav aria-label="Liên kết chân trang">`
  căn phải, chữ 14px đậm 600, mỗi link một dòng: Việc làm, Giới thiệu, Liên hệ + "Đăng ký ứng tuyển" (khách)
  hoặc "CV của tôi" (ứng viên).
- Thanh dưới, ngăn bằng đường kẻ Viền: "© năm TÊN CÔNG TY | CHÍNH SÁCH BẢO MẬT | ĐIỀU KHOẢN SỬ DỤNG",
  chữ 12px viết hoa màu Chì, dấu "|" màu Viền đậm (chỉ trang trí, `aria-hidden`). Link cao tối thiểu 24px.
- Chữ Mực đen / Chì; link hover Xanh mực + gạch chân.
- Dữ liệu: `GET /company/public` (dùng chung kết quả với trang Giới thiệu, giữ trong bộ nhớ phiên ở company.api.js)
  và biến `VITE_CONTACT_*`, `VITE_FACEBOOK_URL`, `VITE_YOUTUBE_URL`. API lỗi thì dùng `VITE_APP_NAME` thay tên công ty,
  vẫn hiện Logo, link, thanh dưới. Trường / biến trống thì ẩn dòng đó; Facebook và YouTube cùng trống thì ẩn cả dòng.
- Dưới 900px: 2 cột xếp dọc, cột link căn trái; thanh dưới mỗi mục một dòng, bỏ dấu "|".
- Không bản đồ, không iframe, không logo mạng xã hội.

### Trang văn bản: Chính sách bảo mật `/privacy`, Điều khoản sử dụng `/terms` (T35e)

- Công khai, theo quy tắc layout như `/about`. Rộng tối đa `--form-max`, phân mục bằng h2 + đoạn văn / danh sách,
  không card. Cuối trang "Cập nhật lần cuối: dd/mm/yyyy" (hằng số trong code, đường kẻ Viền phía trên).

### Trang Đổi mật khẩu (T35e)

- `/candidate/change-password`, `/recruiter/change-password`, `/admin/change-password`, mỗi route chỉ cho đúng role,
  trong layout của role. Trang chỉ có h1 "Đổi mật khẩu" + `ChangePasswordForm` (form không còn h2 và đường kẻ riêng).
  Trang Hồ sơ của cả 3 role không còn form mật khẩu.

### Menu theo role

| Role | Mục menu → đường dẫn |
|---|---|
| Khách, ứng viên (menu ngang, T35d) | Việc làm `/`, Giới thiệu `/about`, Liên hệ `/contact`. Ứng viên thêm AccountMenu: Hồ sơ `/candidate/profile`, CV của tôi `/candidate/cvs`, Đơn ứng tuyển `/candidate/applications`, Đổi mật khẩu `/candidate/change-password` (T35e), Đăng xuất |
| Nhà tuyển dụng | Tổng quan `/recruiter/dashboard` (T35c), Hồ sơ `/recruiter/profile`, Đổi mật khẩu `/recruiter/change-password` (T35e), Công ty `/recruiter/company`, Tin tuyển dụng `/recruiter/jobs`, Ứng viên gợi ý `/recruiter/recommended-candidates` (T34), Đơn ứng tuyển `/recruiter/applications` |
| Quản trị viên | Tổng quan `/admin/dashboard` (T35c), Tài khoản `/admin/users`, Tạo Recruiter `/admin/recruiters/new`, Phân quyền `/admin/roles`, Hồ sơ `/admin/profile` (T35), Đổi mật khẩu `/admin/change-password` (T35e) |

- Mục "Việc làm" trỏ về `/`. Không có `/candidate/jobs`.
  `/`, `/jobs/:id`, `/about`, `/contact`, `/privacy`, `/terms` dùng `SiteLayout` cho khách và ứng viên, `MainLayout`
  cho nhà tuyển dụng và quản trị viên (giao diện HR / Admin giữ nguyên như trước T35d, chỉ thêm Logo và mục Đổi mật khẩu).
- Từ T35d "Việc làm gợi ý" không còn là mục menu mà là tab "Gợi ý theo CV của bạn" trong trang Việc làm
  (`/?view=recommended`). `/candidate/recommended-jobs` chuyển thẳng tới tab này; chi tiết đối chiếu giữ
  `/candidate/recommended-jobs/:jobId`, nút quay lại về `/?view=recommended`.
- Trang chỉnh yêu cầu của tin `/recruiter/jobs/:id/requirements` (T34) mở từ trang sửa tin, không có mục menu riêng;
  nằm dưới `/recruiter/jobs` nên mục "Tin tuyển dụng" vẫn sáng.
- Trang chính của role (đăng nhập xong vào đây): `/candidate` → `/`, `/recruiter` → `/recruiter/dashboard`,
  `/admin` → `/admin/dashboard` (T35c). Không còn trang tạm "Chức năng đang được xây dựng".
- Trạng thái tài khoản (T35) dùng Badge: Đang hoạt động (`ACTIVE`, xanh lá), Đã khóa (`LOCKED`, đỏ).

### Trang đăng nhập (khối điểm nhấn)

```
┌────────────────────────┬──────────────────────────┐
│ nền Xanh mực           │  [T] Tuyển dụng DMatch   │  Logo (T35e)
│                        │  Đăng nhập               │
│ Tuyển dụng DMatch      │  [Email             ]    │
│ serif 36, chữ trắng    │  [Mật khẩu          ]    │
│ một câu giới thiệu     │  [    Đăng nhập     ]    │
└────────────────────────┴──────────────────────────┘
```

Trên điện thoại, khối Xanh mực thành dải phía trên form; Logo ở đầu cột form chỉ còn ô chữ dưới 768px. Tên hệ thống lấy từ `VITE_APP_NAME`
(mặc định "Tuyển dụng DMatch").

## 7. Bảng (`Table`)

- Khung viền `--color-border`, bo `--radius-md`; bảng rộng thì cuộn ngang trong khung, không cuộn cả trang.
- Hàng tiêu đề: nền `--color-bg`, chữ 14px đậm 600, viết thường.
- Hàng dữ liệu: 14px, cao tối thiểu 44px, chỉ kẻ ngang, không tô sọc.
- Cột số căn phải, dùng chữ số đều (`tabular-nums`); cột thao tác căn phải, nút cỡ nhỏ.
- Rỗng: một hàng gộp mọi cột, chữ Chì căn giữa "Chưa có dữ liệu".
- Cột chữ chính (tên vị trí, tiêu đề tin, email, tên file, yêu cầu) đặt độ rộng tối thiểu
  `calc(var(--sidebar-width) * 0.85)` trên khung nội dung của ô (thẻ khối, không đặt lên thẻ `<a>`):
  nội dung có `overflow-wrap: anywhere` làm bảng tự thu cột còn vài chữ cái, màn hình 375px sẽ bẻ chữ thành
  từng mẩu. Có độ rộng tối thiểu thì bảng cuộn ngang trong khung thay vì bẻ chữ (T35, sửa đủ ở T35c).

## 8. Form (`Input`, `Select`, `Textarea`)

- Nhãn trên ô, 14px đậm 600; ô cao 40px, chữ 16px, viền `--color-border-strong`, bo 4px.
- Gợi ý dưới ô: 12px Chì. Lỗi: 12px Đỏ, viền đỏ, `aria-invalid`, gắn bằng `aria-describedby`.
- Bắt buộc: dấu `*` màu Đỏ sau nhãn.
- Một cột; hai cột chỉ cho cặp trường ngắn (ngày bắt đầu / kết thúc) từ 768px.
- Nút hành động ở cuối form, căn trái theo cột ô nhập, nút chính đứng trước.

## 9. Nút và trạng thái (`Button`)

| Kiểu | Thường | Hover |
|---|---|---|
| `primary` | Nền Xanh mực, chữ trắng | Xanh mực đậm |
| `secondary` | Nền Giấy, viền Viền đậm, chữ Mực đen | Nền `--color-hover` |
| `danger` | Nền Đỏ, chữ trắng (xóa, khóa) | `--color-danger-hover` |
| `ghost` | Chỉ chữ Xanh mực, không viền (thao tác phụ trong bảng) | Gạch chân |

- Cỡ: `md` cao 40px, `sm` cao 32px (dùng trong bảng).
- Focus (chỉ khi dùng bàn phím, `:focus-visible`): viền ngoài 2px Xanh mực, cách 2px —
  giống nhau cho mọi thành phần bấm được.
- Disabled: nền `--color-disabled-bg`, chữ `--color-disabled-text`, con trỏ not-allowed;
  không dùng opacity.
- Đang xử lý: nút bị khóa và đổi chữ ("Đang lưu...").
- Chuyển màu khi hover 120ms; thành phần thêm từ T35f (thẻ tin, tab, nút Tìm, link dạng nút) dùng 150ms
  (`--duration-base`). Có `prefers-reduced-motion` thì tắt chuyển động (vòng xoay Loading, hiệu ứng mở modal,
  nhịp của khung xương).

## 10. Các component khác

- `Modal`: rộng tối đa 520px, bo 8px, có bóng. Đóng bằng Esc, nút "Đóng" hoặc bấm ra lớp phủ.
  Nút hành động ở chân modal căn phải (khác form trên trang, vốn căn trái).
- `Loading`: vòng xoay CSS kèm chữ "Đang tải...". Danh sách thẻ tin dùng khung xương thay cho Loading (T35f).
- `Modal` (T35f): thêm prop tùy chọn `closeButtonClassName` cho nút "Đóng" ở đầu modal (hộp ứng tuyển dùng để nút
  cao 44px trên điện thoại); không truyền thì như cũ.
- `CvViewButton` (T35f): thêm prop `variant` (mặc định ghost như trong bảng; thẻ CV dùng secondary).
- `Pagination`: "Trước", số trang, "Sau"; trang hiện tại nền Xanh nhạt; ẩn khi chỉ có 1 trang.
- `Badge`: 12px đậm 600, bo 4px, có viền; màu theo prop `status` (mục 2).
- `StatCard` (T35c, `components/dashboard/`): ô chỉ có viền, nhãn 14px Chì, con số `--text-xl` đậm 600 chữ số đều,
  dòng phụ 12px. Chưa có dữ liệu để tính thì hiện "Chưa có dữ liệu" thay cho con số.
- `BarChart` (T35c): cột dọc vẽ bằng div + CSS module, không thư viện biểu đồ. Một chuỗi số liệu nên một màu
  (Xanh mực, hover Xanh mực đậm), không thang đỏ - xanh. Thanh rộng tối đa 24px, bo 4px đầu trên, vuông ở đáy,
  khe 2px giữa các thanh. Trục dọc 3 vạch (0, giữa, đỉnh), đường đáy Viền đậm, đường kẻ Viền; có nhãn trục.
  Rê chuột lên cả cột hiện chú thích nền Mực đen chữ trắng. Từ 12 cột trở xuống ghi số trên đỉnh cột.
  Có bảng số liệu ẩn cho trình đọc màn hình. Tổng bằng 0 thì hiện "Chưa có dữ liệu". Vùng vẽ cao `--space-8` × 3.
- `NotificationBell` (T35b, chỉ ứng viên và nhà tuyển dụng): nút chuông 32px trên Header, cạnh email.
  Chuông vẽ bằng SVG nét `currentColor` ngay trong code (không thư viện icon). Ngoài chuông, icon chức năng chỉ có
  3 icon của footer (T35e, xem dưới).
  Số chưa đọc: ô Đỏ (`--color-danger-text`) chữ trắng 12px, bo 4px, trên 9 hiện "9+", bằng 0 thì ẩn.
  Dropdown rộng `--popover-width` 360px, lớp `--z-dropdown`, chỉ có viền Viền đậm, không đổ bóng (bóng chỉ dành cho modal);
  dưới 900px bám theo màn hình ngay dưới Header. Thông báo chưa đọc: nền Xanh nhạt + chữ đậm.
  Đóng bằng bấm ra ngoài hoặc Esc. Từ T35d chuông của ứng viên nằm trên SiteLayout, logic giữ nguyên.
- `AccountMenu` (T35d, `components/layout/`, chỉ ứng viên): nút cao 32px gồm ô tròn 24px chữ cái đầu của tên
  (nền Xanh nhạt, chữ `#0A4FA0`, 12px đậm 600; ô tròn là ngoại lệ duy nhất của quy tắc "không bo tròn"),
  tên rút gọn (chữ cuối của họ tên, vd "Nguyễn Thị Ánh" → "Ánh"; chưa có họ tên thì lấy phần trước @ của email;
  dài thì cắt "...") và dấu ▾ vẽ bằng tam giác viền CSS. Không ảnh đại diện, không thư viện icon.
  Họ tên lấy từ `GET /candidates/me` (phiên đăng nhập chỉ có id, email, role) và giữ ở AuthContext (`profileName`):
  trang Hồ sơ lưu xong cập nhật ngay, nút đổi tên không cần tải lại.
  Panel rộng `--sidebar-width`, nền Giấy, viền Viền (`#DDE4EE`), bo 8px, không đổ bóng; phần đầu họ tên (14px đậm)
  + email (12px Chì), dưới là Hồ sơ, CV của tôi, Đơn ứng tuyển, Đổi mật khẩu, đường kẻ, Đăng xuất. Trang đang mở có nền Xanh nhạt
  như Sidebar. `aria-haspopup="menu"`, `aria-expanded`; danh sách `role="menu"`, mục `role="menuitem"`.
  Đi bằng Tab hoặc mũi tên lên / xuống (Home / End); mũi tên xuống trên nút thì mở và vào mục đầu.
  Đóng khi bấm ra ngoài, Esc (trả focus về nút), Tab ra khỏi menu hoặc đổi route.
- Tab trong trang (T35d, trang Việc làm của ứng viên): chữ 14px đậm 500 trên một đường kẻ Viền, không dạng nút,
  không khung. Tab khác màu Chì; tab đang chọn chữ Mực đen + gạch chân 2px Xanh mực đè lên đường kẻ (giống menu chính).
  `role="tablist"` / `"tab"` / `"tabpanel"`, `aria-selected`; chỉ tab đang chọn nằm trong thứ tự Tab, mũi tên trái / phải,
  Home / End để chuyển. Tab đang chọn lưu trên URL. Số trong ngoặc chỉ hiện khi đã có dữ liệu thật
  (không "(0)" giả, không vòng xoay trong tab). Màn hình hẹp thì cả cụm tab xuống dòng, chữ trong tab không bẻ.
- Card gợi ý việc làm (tab Gợi ý): cả card bấm được (link "Xem chi tiết đối chiếu" phủ kín card bằng `::after`,
  tên tin nằm ẩn trong link cho trình đọc màn hình). Từ T35f cùng kiểu với thẻ tin của tab Tất cả: tiêu đề serif,
  rê chuột viền Xanh mực, Badge "Đã ứng tuyển" ở chân thẻ, coverage qua `CoverageBar` (components/matching).
- `Logo` (T35e, `components/layout/`): ô vuông `--logo-mark-size` 28px nền Xanh mực, chữ cái đầu của `VITE_APP_NAME`
  màu trắng (5.69:1), font tiêu đề, bo `--radius-sm`; bên cạnh là tên hệ thống font tiêu đề 18px đậm 600, Mực đen.
  Cả khối là link: khách / ứng viên về `/`, HR về `/recruiter/dashboard`, Admin về `/admin/dashboard`;
  `aria-label="<tên> - Trang chủ"`, ô chữ `aria-hidden`. Không nền, không viền; hover chỉ đổi tên sang Xanh mực.
  Dưới 768px chỉ còn ô chữ (tên vẫn trong `aria-label`); tên dài thì cắt "...". Dùng ở SiteLayout, Header của
  MainLayout, footer và trang đăng nhập.
  `public/favicon.svg`: SVG viết tay cùng kiểu (ô Xanh mực + chữ "D" trắng theo `VITE_APP_NAME=DMatch`, font hệ thống dự phòng); đổi
  `VITE_APP_NAME` thì sửa tay chữ trong file.
- Icon footer (`FooterIcons.jsx`, T35e, **icon chức năng ở footer — ngoại lệ đã duyệt**): vị trí, điện thoại, phong bì;
  SVG viết tay, 16px, chỉ nét 2px màu Chì (6.44:1), `aria-hidden="true"`; nhãn cho trình đọc màn hình nằm ở dòng chữ.
  Không thư viện icon, không logo Facebook / YouTube (chỉ link chữ).

## 11. Nguyên tắc riêng của hệ thống

- Coverage hiển thị dạng "7/10 yêu cầu có bằng chứng". Không dùng vòng tròn điểm hay thang màu
  kiểu chấm điểm: coverage chỉ là chỉ số đối chiếu, không phải điểm năng lực.
- AI chỉ hỗ trợ: kết quả phân tích luôn đi kèm bằng chứng, không trình bày như quyết định.
- Không dùng: gradient, emoji, icon (trừ chuông thông báo và 3 icon footer), mũi tên "→" trong nút,
  nhãn viết hoa phía trên tiêu đề, card đổ bóng cho từng phần.
