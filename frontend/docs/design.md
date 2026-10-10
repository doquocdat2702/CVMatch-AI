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
| Chữ phụ Xanh nhạt trên Xanh mực (khối đăng nhập) | 4.99:1 | Đạt |
| Chữ disabled trên nền disabled | 3.13:1 | WCAG miễn cho thành phần bị vô hiệu |

## 3. Font

Nạp 2 font từ Google Fonts trong `index.html` (cả hai có bộ chữ tiếng Việt):

| Font | Độ đậm | Biến | Dùng cho |
|---|---|---|---|
| Be Vietnam Pro | 400, 500, 600 | `--font-sans` | Toàn bộ giao diện: menu, bảng, form, nút, đoạn văn |
| Source Serif 4 | 600 | `--font-serif` | Chỉ tiêu đề trang (h1) và khối điểm nhấn |

Be Vietnam Pro do người Việt thiết kế cho tiếng Việt, dấu chồng (ẩ, ỗ, ừ) rõ ở cỡ 12–14px trong bảng.
Source Serif 4 tạo cảm giác "tiêu đề hồ sơ", không dùng cho đoạn văn hay bảng.

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
| `--text-3xl` / `--leading-3xl` | 36 / 44 | Chỉ khối điểm nhấn: trang đăng nhập, việc làm công khai |

- Dòng của tiêu đề không thấp hơn 1.3 để dấu tiếng Việt không bị cắt.
- Độ đậm: `--weight-regular` 400 chữ thường, `--weight-medium` 500 menu và nút,
  `--weight-semibold` 600 tiêu đề, nhãn, tiêu đề cột.
- Không viết hoa toàn bộ cho nhãn hay tiêu đề cột.
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
- Bóng: chỉ modal có bóng (`--shadow-modal`). Không bọc nội dung trong card đổ bóng.

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

- `MainLayout` = `Header` + `Sidebar` + vùng nội dung. Nội dung căn trái, rộng tối đa
  `--content-max` 1200px; form rộng tối đa `--form-max` 640px.
- Phân tách các phần bằng tiêu đề và khoảng trắng, không bằng card.
- Menu đang chọn: nền Xanh nhạt, chữ `#0A4FA0` đậm 600, vạch trái 3px Xanh mực
  (vạch giúp nhận ra mục đang chọn mà không cần phân biệt màu).
- Dưới 900px: sidebar thành hàng menu nằm dưới header, tự xuống dòng; không cuộn ngang trang.
- Media query không dùng được biến CSS, nên 2 mốc cố định là **900px** (bố cục) và **768px** (form 2 cột).

### Menu theo role

| Role | Mục menu → đường dẫn |
|---|---|
| Ứng viên | Việc làm `/`, Việc làm gợi ý `/candidate/recommended-jobs` (T30), CV của tôi `/candidate/cvs`, Hồ sơ `/candidate/profile`, Đơn ứng tuyển `/candidate/applications` |
| Nhà tuyển dụng | Hồ sơ `/recruiter/profile`, Công ty `/recruiter/company`, Tin tuyển dụng `/recruiter/jobs`, Đơn ứng tuyển `/recruiter/applications` |
| Quản trị viên | Tài khoản `/admin/users`, Tạo Recruiter `/admin/recruiters/new`, Phân quyền `/admin/roles` |

- Mục "Việc làm" của ứng viên trỏ về `/`. Không có `/candidate/jobs`.
  Từ T31, `/` và `/jobs/:id` dùng `PublicLayout` khi chưa đăng nhập, `MainLayout` khi là ứng viên.
- `/recruiter/dashboard` và `/admin/dashboard` đã chừa route, làm ở T35c.
- Trang chính của role: `/candidate` → `/`, `/recruiter` → `/recruiter/jobs`, `/admin` → `/admin/users`.
  Đến T35c đổi recruiter và admin sang trang dashboard.
- Mục menu chưa có trang hiển thị "Chức năng đang được xây dựng" bên trong layout.

### Trang đăng nhập (khối điểm nhấn)

```
┌────────────────────────┬──────────────────────────┐
│ nền Xanh mực           │  Đăng nhập               │
│ Tuyển dụng DMatch      │  [Email             ]    │
│ serif 36, chữ trắng    │  [Mật khẩu          ]    │
│ một câu giới thiệu     │  [    Đăng nhập     ]    │
└────────────────────────┴──────────────────────────┘
```

Trên điện thoại, khối Xanh mực thành dải phía trên form. Tên hệ thống lấy từ `VITE_APP_NAME`
(mặc định "Tuyển dụng DMatch").

## 7. Bảng (`Table`)

- Khung viền `--color-border`, bo `--radius-md`; bảng rộng thì cuộn ngang trong khung, không cuộn cả trang.
- Hàng tiêu đề: nền `--color-bg`, chữ 14px đậm 600, viết thường.
- Hàng dữ liệu: 14px, cao tối thiểu 44px, chỉ kẻ ngang, không tô sọc.
- Cột số căn phải, dùng chữ số đều (`tabular-nums`); cột thao tác căn phải, nút cỡ nhỏ.
- Rỗng: một hàng gộp mọi cột, chữ Chì căn giữa "Chưa có dữ liệu".

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
- Chuyển màu khi hover 120ms. Có `prefers-reduced-motion` thì tắt chuyển động
  (vòng xoay Loading, hiệu ứng mở modal).

## 10. Các component khác

- `Modal`: rộng tối đa 520px, bo 8px, có bóng. Đóng bằng Esc, nút "Đóng" hoặc bấm ra lớp phủ.
  Nút hành động ở chân modal căn phải (khác form trên trang, vốn căn trái).
- `Loading`: vòng xoay CSS kèm chữ "Đang tải...".
- `Pagination`: "Trước", số trang, "Sau"; trang hiện tại nền Xanh nhạt; ẩn khi chỉ có 1 trang.
- `Badge`: 12px đậm 600, bo 4px, có viền; màu theo prop `status` (mục 2).

## 11. Nguyên tắc riêng của hệ thống

- Coverage hiển thị dạng "7/10 yêu cầu có bằng chứng". Không dùng vòng tròn điểm hay thang màu
  kiểu chấm điểm: coverage chỉ là chỉ số đối chiếu, không phải điểm năng lực.
- AI chỉ hỗ trợ: kết quả phân tích luôn đi kèm bằng chứng, không trình bày như quyết định.
- Không dùng: gradient, emoji, icon, mũi tên "→" trong nút, nhãn viết hoa phía trên tiêu đề,
  card đổ bóng cho từng phần.
