/* =========================================================
   SQL Server schema v4 cho hệ thống học tiếng Anh cá nhân hoá
   Cập nhật theo yêu cầu:
   - Thêm LoaiTaiKhoan cho TaiKhoan
   - Thêm TrinhDoHienTai cho NguoiDung
   - Bỏ bảng LoaiBaiTapAI và ChuDeHocTap
   - Thu gọn phần đề thi: DeThiAI lưu JSON toàn bộ đề, BaiLamDeThiAI lưu bài làm đề
   - Có bảng chính sách tài khoản để cấu hình quota basic/premium/max
   - Việt hoá tên bảng/cột để dễ đọc
   ========================================================= */

/* =========================================================
   1) CHÍNH SÁCH LOẠI TÀI KHOẢN
   =========================================================
   Bảng này dùng để cấu hình quota theo từng loại tài khoản.
   Basic/Premium/Max đều có thể chỉnh ở đây mà không cần sửa code.
   ========================================================= */

create database english_ai
go 
   
use english_ai
go

CREATE TABLE dbo.ChinhSachLoaiTaiKhoan (
    LoaiTaiKhoan                 NVARCHAR(20)  NOT NULL CONSTRAINT PK_ChinhSachLoaiTaiKhoan PRIMARY KEY,
    TenLoaiTaiKhoan              NVARCHAR(100) NOT NULL,
    MoTa                         NVARCHAR(500) NULL,
    SoBaiTapKyNangToiDaMoiNgay   INT NOT NULL CONSTRAINT DF_ChinhSachLoaiTaiKhoan_SoBaiTapKyNangToiDaMoiNgay DEFAULT (2),
    DanhSachKieuBaiTapApDungJson NVARCHAR(MAX) NOT NULL CONSTRAINT DF_ChinhSachLoaiTaiKhoan_DanhSachKieuBaiTapApDungJson DEFAULT (N'["listening","speaking","reading","writing", "grammar"]'),
    SoDeThiToiDaMoiThang         INT NOT NULL CONSTRAINT DF_ChinhSachLoaiTaiKhoan_SoDeThiToiDaMoiThang DEFAULT (1),
    ChoPhepTaiTaoBaiTap          BIT NOT NULL CONSTRAINT DF_ChinhSachLoaiTaiKhoan_ChoPhepTaiTaoBaiTap DEFAULT (1),
    ChoPhepTaiTaoDeThi           BIT NOT NULL CONSTRAINT DF_ChinhSachLoaiTaiKhoan_ChoPhepTaiTaoDeThi DEFAULT (1),
    DangSuDung                   BIT NOT NULL CONSTRAINT DF_ChinhSachLoaiTaiKhoan_DangSuDung DEFAULT (1),
    NgayTao                      DATETIME2(0) NOT NULL CONSTRAINT DF_ChinhSachLoaiTaiKhoan_NgayTao DEFAULT SYSDATETIME(),

    CONSTRAINT CK_ChinhSachLoaiTaiKhoan_SoBaiTapKyNangToiDaMoiNgay CHECK (SoBaiTapKyNangToiDaMoiNgay >= 0),
    CONSTRAINT CK_ChinhSachLoaiTaiKhoan_SoDeThiToiDaMoiThang CHECK (SoDeThiToiDaMoiThang >= 0),
    CONSTRAINT CK_ChinhSachLoaiTaiKhoan_DanhSachKieuBaiTapApDungJson CHECK (ISJSON(DanhSachKieuBaiTapApDungJson) = 1)
);
GO

INSERT INTO dbo.ChinhSachLoaiTaiKhoan (
    LoaiTaiKhoan, TenLoaiTaiKhoan, MoTa,
    SoBaiTapKyNangToiDaMoiNgay, SoDeThiToiDaMoiThang,
    ChoPhepTaiTaoBaiTap, ChoPhepTaiTaoDeThi, DangSuDung
)
VALUES
(N'basic',   N'Cơ bản',  N'Gói mặc định cho người dùng mới', 5, 1, 1, 1, 1),
(N'premium', N'Premium', N'Gói nâng cao với quota rộng hơn', 15, 10, 1, 1, 1),
(N'max',     N'Max',     N'Gói cao nhất, linh hoạt nhất',     30, 20, 1, 1, 1);
GO

/* =========================================================
   2) TÀI KHOẢN & HỒ SƠ NGƯỜI DÙNG
   ========================================================= */

CREATE TABLE dbo.TaiKhoan (
    TaiKhoanId            INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_TaiKhoan PRIMARY KEY,
    TenDangNhap           NVARCHAR(100) NOT NULL,
    Email                 NVARCHAR(255) NULL,
    MatKhauHash           NVARCHAR(255) NOT NULL,
    LoaiTaiKhoan          NVARCHAR(20) NOT NULL CONSTRAINT DF_TaiKhoan_LoaiTaiKhoan DEFAULT N'basic',
    PhuongThucDangNhap    NVARCHAR(20) NOT NULL CONSTRAINT DF_TaiKhoan_PhuongThucDangNhap DEFAULT N'local',
    MaGoogle              NVARCHAR(255) NULL,
    MaFacebook            NVARCHAR(255) NULL,
    TrangThaiTaiKhoan     NVARCHAR(20) NOT NULL CONSTRAINT DF_TaiKhoan_TrangThai DEFAULT N'active',
    LanDangNhapCuoi       DATETIME2(0) NULL,
    NgayTao               DATETIME2(0) NOT NULL CONSTRAINT DF_TaiKhoan_NgayTao DEFAULT SYSDATETIME(),
    NgayCapNhat           DATETIME2(0) NOT NULL CONSTRAINT DF_TaiKhoan_NgayCapNhat DEFAULT SYSDATETIME(),

    CONSTRAINT UQ_TaiKhoan_TenDangNhap UNIQUE (TenDangNhap),
    CONSTRAINT UQ_TaiKhoan_Email UNIQUE (Email),
    CONSTRAINT UQ_TaiKhoan_MaGoogle UNIQUE (MaGoogle),
    CONSTRAINT UQ_TaiKhoan_MaFacebook UNIQUE (MaFacebook),
    CONSTRAINT FK_TaiKhoan_ChinhSachLoaiTaiKhoan FOREIGN KEY (LoaiTaiKhoan) REFERENCES dbo.ChinhSachLoaiTaiKhoan(LoaiTaiKhoan),
    CONSTRAINT CK_TaiKhoan_PhuongThucDangNhap CHECK (PhuongThucDangNhap IN (N'local', N'google', N'facebook')),
    CONSTRAINT CK_TaiKhoan_TrangThai CHECK (TrangThaiTaiKhoan IN (N'active', N'inactive', N'banned')),
    CONSTRAINT CK_TaiKhoan_LoaiTaiKhoan CHECK (LoaiTaiKhoan IN (N'basic', N'premium', N'max'))
);
GO

ALTER TABLE dbo.TaiKhoan
ADD VaiTro NVARCHAR(20) NOT NULL 
    CONSTRAINT DF_TaiKhoan_VaiTro DEFAULT N'customer';
GO

ALTER TABLE dbo.TaiKhoan
ADD CONSTRAINT CK_TaiKhoan_VaiTro
CHECK (VaiTro IN (N'customer', N'admin'));
GO

UPDATE dbo.TaiKhoan
SET VaiTro = N'admin'
WHERE TaiKhoanId = 1;



select * from dbo.TaiKhoan
select * from dbo.NguoiDung
select * from dbo.LichSuTrangThaiTaiKhoan

CREATE TABLE dbo.NguoiDung (
    NguoiDungId           INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_NguoiDung PRIMARY KEY,
    TaiKhoanId            INT NOT NULL,
    HoVaTen               NVARCHAR(100) NULL,
    SoDienThoai           NVARCHAR(20) NULL,
    AnhDaiDienUrl         NVARCHAR(255) NULL,
    TieuSu                NVARCHAR(MAX) NULL,
    DiaChi                NVARCHAR(255) NULL,
    NgaySinh              DATE NULL,
    GioiTinh              NVARCHAR(20) NULL,
    TrinhDoHienTai        NVARCHAR(20) NULL,
    NgayCapNhatTrinhDo    DATETIME2(0) NULL,
    NgayTao               DATETIME2(0) NOT NULL CONSTRAINT DF_NguoiDung_NgayTao DEFAULT SYSDATETIME(),
    NgayCapNhat           DATETIME2(0) NOT NULL CONSTRAINT DF_NguoiDung_NgayCapNhat DEFAULT SYSDATETIME(),

    CONSTRAINT UQ_NguoiDung_TaiKhoan UNIQUE (TaiKhoanId),
    CONSTRAINT FK_NguoiDung_TaiKhoan FOREIGN KEY (TaiKhoanId) REFERENCES dbo.TaiKhoan(TaiKhoanId) ON DELETE CASCADE,
    CONSTRAINT CK_NguoiDung_TrinhDoHienTai CHECK (TrinhDoHienTai IS NULL OR TrinhDoHienTai IN (N'A1', N'A2', N'B1', N'B2', N'C1', N'C2'))
);
GO

CREATE TABLE dbo.LichSuTrangThaiTaiKhoan (
    LichSuTrangThaiTaiKhoanId INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_LichSuTrangThaiTaiKhoan PRIMARY KEY,
    TaiKhoanId               INT NOT NULL,
    TrangThaiCu              NVARCHAR(20) NOT NULL,
    TrangThaiMoi             NVARCHAR(20) NOT NULL,
    MaLyDo                   NVARCHAR(32) NULL,
    GhiChu                   NVARCHAR(MAX) NULL,
    ThayDoiBoiTaiKhoanId     INT NULL,
    NgayThayDoi              DATETIME2(0) NOT NULL CONSTRAINT DF_LichSuTrangThaiTaiKhoan_NgayThayDoi DEFAULT SYSDATETIME(),

    CONSTRAINT FK_LichSuTrangThaiTaiKhoan_TaiKhoan 
FOREIGN KEY (TaiKhoanId) 
REFERENCES dbo.TaiKhoan(TaiKhoanId) 
ON DELETE CASCADE,

CONSTRAINT FK_LichSuTrangThaiTaiKhoan_ThayDoiBoi 
FOREIGN KEY (ThayDoiBoiTaiKhoanId) 
REFERENCES dbo.TaiKhoan(TaiKhoanId) 
ON DELETE NO ACTION,
    CONSTRAINT CK_LichSuTrangThaiTaiKhoan_TrangThaiCu CHECK (TrangThaiCu IN (N'active', N'inactive', N'banned')),
    CONSTRAINT CK_LichSuTrangThaiTaiKhoan_TrangThaiMoi CHECK (TrangThaiMoi IN (N'active', N'inactive', N'banned'))
);
GO

CREATE INDEX IX_LichSuTrangThaiTaiKhoan_TaiKhoanId ON dbo.LichSuTrangThaiTaiKhoan(TaiKhoanId);
CREATE INDEX IX_LichSuTrangThaiTaiKhoan_NgayThayDoi ON dbo.LichSuTrangThaiTaiKhoan(NgayThayDoi);
GO

/* =========================================================
   3) BÀI TẬP AI (dùng cho luyện tập cá nhân hoá)
   =========================================================
   Bỏ bảng loại bài tập/chủ đề, thay bằng cột text trực tiếp.
   ========================================================= */

CREATE TABLE dbo.BaiTapAI (
    BaiTapAIId         INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_BaiTapAI PRIMARY KEY,
    NguoiDungId        INT NOT NULL,
    KieuBaiTap         NVARCHAR(50) NOT NULL,    -- ví dụ: listening, speaking, reading, writing, multiple_choice...
    ChuDeBaiTap        NVARCHAR(200) NULL,       -- text tự do, không cần bảng danh mục
    TrinhDo            NVARCHAR(20) NOT NULL,    -- A1/A2/B1/B2/...
    NoiDungJson        NVARCHAR(MAX) NOT NULL,   -- toàn bộ nội dung bài do AI tạo
    TrangThaiBaiTap    NVARCHAR(20) NOT NULL CONSTRAINT DF_BaiTapAI_TrangThai DEFAULT N'active',
    NgayTao            DATETIME2(0) NOT NULL CONSTRAINT DF_BaiTapAI_NgayTao DEFAULT SYSDATETIME(),
    NgayCapNhat        DATETIME2(0) NOT NULL CONSTRAINT DF_BaiTapAI_NgayCapNhat DEFAULT SYSDATETIME(),

    CONSTRAINT FK_BaiTapAI_NguoiDung FOREIGN KEY (NguoiDungId) REFERENCES dbo.NguoiDung(NguoiDungId) ON DELETE CASCADE,
    CONSTRAINT CK_BaiTapAI_TrangThai CHECK (TrangThaiBaiTap IN (N'active', N'archived')),
    CONSTRAINT CK_BaiTapAI_NoiDungJson CHECK (ISJSON(NoiDungJson) = 1)
);
GO

select * from dbo.BaiTapAI
delete from dbo.BaiTapAI

CREATE INDEX IX_BaiTapAI_NguoiDungId ON dbo.BaiTapAI(NguoiDungId);
CREATE INDEX IX_BaiTapAI_KieuBaiTap ON dbo.BaiTapAI(KieuBaiTap);
CREATE INDEX IX_BaiTapAI_TrinhDo ON dbo.BaiTapAI(TrinhDo);
CREATE INDEX IX_BaiTapAI_NgayTao ON dbo.BaiTapAI(NgayTao);
GO

/* =========================================================
   4) ĐỀ THI AI + BÀI LÀM ĐỀ THI
   =========================================================
   Thiết kế đơn giản:
   - DeThiAI: lưu dữ liệu đề thi do AI tạo ra (JSON toàn bộ đề)
   - BaiLamDeThiAI: lưu dữ liệu làm đề của người dùng + chấm tổng
   ========================================================= */

CREATE TABLE dbo.DeThiAI (
    DeThiAIId        INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_DeThiAI PRIMARY KEY,
    NguoiDungId      INT NOT NULL,
    TenDeThi         NVARCHAR(200) NOT NULL,
    KieuDeThi        NVARCHAR(30) NOT NULL CONSTRAINT DF_DeThiAI_KieuDeThi DEFAULT N'placement',
    TongSoPhan       INT NOT NULL CONSTRAINT DF_DeThiAI_TongSoPhan DEFAULT (0),
    TongSoBaiTap     INT NOT NULL CONSTRAINT DF_DeThiAI_TongSoBaiTap DEFAULT (0),
    NoiDungJson      NVARCHAR(MAX) NOT NULL,
    ThoiGianLamDe    INT NOT NULL CONSTRAINT DF_DeThiAI_ThoiGianLamDe DEFAULT (0),
    TrangThaiDeThi   NVARCHAR(20) NOT NULL CONSTRAINT DF_DeThiAI_TrangThai DEFAULT N'draft',
    NgayTao          DATETIME2(0) NOT NULL CONSTRAINT DF_DeThiAI_NgayTao DEFAULT SYSDATETIME(),

    CONSTRAINT FK_DeThiAI_NguoiDung FOREIGN KEY (NguoiDungId) REFERENCES dbo.NguoiDung(NguoiDungId) ON DELETE CASCADE,
    CONSTRAINT CK_DeThiAI_KieuDeThi CHECK (KieuDeThi IN (N'placement', N'followup', N'practice')),
    CONSTRAINT CK_DeThiAI_TongSoPhan CHECK (TongSoPhan >= 0),
    CONSTRAINT CK_DeThiAI_TongSoBaiTap CHECK (TongSoBaiTap >= 0),
    CONSTRAINT CK_DeThiAI_ThoiGianLamDe CHECK (ThoiGianLamDe >= 0),
    CONSTRAINT CK_DeThiAI_TrangThai CHECK (TrangThaiDeThi IN (N'draft', N'generated', N'archived')),
    CONSTRAINT CK_DeThiAI_NoiDungJson CHECK (ISJSON(NoiDungJson) = 1)
);
GO

select * from dbo.DeThiAI

CREATE INDEX IX_DeThiAI_NguoiDungId ON dbo.DeThiAI(NguoiDungId);
CREATE INDEX IX_DeThiAI_KieuDeThi ON dbo.DeThiAI(KieuDeThi);
CREATE INDEX IX_DeThiAI_TrangThaiDeThi ON dbo.DeThiAI(TrangThaiDeThi);
CREATE INDEX IX_DeThiAI_NgayTao ON dbo.DeThiAI(NgayTao);
GO

CREATE TABLE dbo.BaiLamDeThiAI (
    BaiLamDeThiAIId    INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_BaiLamDeThiAI PRIMARY KEY,
    DeThiAIId          INT NOT NULL,
    NguoiDungId        INT NOT NULL,
    LanThu             INT NOT NULL CONSTRAINT DF_BaiLamDeThiAI_LanThu DEFAULT (1),
    CauTraLoiJson      NVARCHAR(MAX) NULL,
    KetQuaChamJson     NVARCHAR(MAX) NULL,
    DiemSo             DECIMAL(5,2) NULL,
    TongSoCau          INT NULL,
    SoCauDung          INT NULL,
    SoCauSai           INT NULL,
    TrinhDoNhanDinhAI  NVARCHAR(20) NULL,
    ThoiGianLamPhut    INT NULL,
    TrangThaiBaiLam    NVARCHAR(20) NOT NULL CONSTRAINT DF_BaiLamDeThiAI_TrangThai DEFAULT N'in_progress',
    NhanXetAI          NVARCHAR(MAX) NULL,
    NgayTao            DATETIME2(0) NOT NULL CONSTRAINT DF_BaiLamDeThiAI_NgayTao DEFAULT SYSDATETIME(),

    CONSTRAINT FK_BaiLamDeThiAI_DeThiAI FOREIGN KEY (DeThiAIId) REFERENCES dbo.DeThiAI(DeThiAIId) ON DELETE CASCADE,
    CONSTRAINT FK_BaiLamDeThiAI_NguoiDung FOREIGN KEY (NguoiDungId) REFERENCES dbo.NguoiDung(NguoiDungId) ON DELETE NO ACTION,
    CONSTRAINT UQ_BaiLamDeThiAI UNIQUE (NguoiDungId, DeThiAIId, LanThu),
    CONSTRAINT CK_BaiLamDeThiAI_TrangThai CHECK (TrangThaiBaiLam IN (N'in_progress', N'submitted', N'graded')),
    CONSTRAINT CK_BaiLamDeThiAI_CauTraLoiJson CHECK (CauTraLoiJson IS NULL OR ISJSON(CauTraLoiJson) = 1),
    CONSTRAINT CK_BaiLamDeThiAI_KetQuaChamJson CHECK (KetQuaChamJson IS NULL OR ISJSON(KetQuaChamJson) = 1)
);
GO

CREATE INDEX IX_BaiLamDeThiAI_DeThiAIId ON dbo.BaiLamDeThiAI(DeThiAIId);
CREATE INDEX IX_BaiLamDeThiAI_NguoiDungId ON dbo.BaiLamDeThiAI(NguoiDungId);
CREATE INDEX IX_BaiLamDeThiAI_TrangThaiBaiLam ON dbo.BaiLamDeThiAI(TrangThaiBaiLam);
CREATE INDEX IX_BaiLamDeThiAI_NgayTao ON dbo.BaiLamDeThiAI(NgayTao);
GO

/* =========================================================
   5) BÀI LÀM + CHẤM ĐIỂM CHO BÀI TẬP AI THƯỜNG
   ========================================================= */

CREATE TABLE dbo.BaiLamBaiTapAI (
    BaiLamBaiTapAIId     INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_BaiLamBaiTapAI PRIMARY KEY,
    BaiTapAIId           INT NOT NULL,
    NguoiDungId          INT NOT NULL,
    LanThu               INT NOT NULL CONSTRAINT DF_BaiLamBaiTapAI_LanThu DEFAULT (1),
    CauTraLoiJson        NVARCHAR(MAX) NULL,
    KetQuaChamJson       NVARCHAR(MAX) NULL,
    DiemSo               DECIMAL(5,2) NULL,
    TongSoCau            INT NULL,
    SoCauDung            INT NULL,
    SoCauSai             INT NULL,
    ThoiGianBatDau       DATETIME2(0) NULL,
    ThoiGianHoanThanh    DATETIME2(0) NULL,
    ThoiGianLamPhut      INT NULL,
    TrangThaiBaiLam      NVARCHAR(20) NOT NULL CONSTRAINT DF_BaiLamBaiTapAI_TrangThai DEFAULT N'in_progress',
    NhanXetAI            NVARCHAR(MAX) NULL,
    NgayTao              DATETIME2(0) NOT NULL CONSTRAINT DF_BaiLamBaiTapAI_NgayTao DEFAULT SYSDATETIME(),

    CONSTRAINT FK_BaiLamBaiTapAI_BaiTapAI 
FOREIGN KEY (BaiTapAIId) 
REFERENCES dbo.BaiTapAI(BaiTapAIId) 
ON DELETE CASCADE,

CONSTRAINT FK_BaiLamBaiTapAI_NguoiDung 
FOREIGN KEY (NguoiDungId) 
REFERENCES dbo.NguoiDung(NguoiDungId) 
ON DELETE NO ACTION,
    CONSTRAINT UQ_BaiLamBaiTapAI UNIQUE (NguoiDungId, BaiTapAIId, LanThu),
    CONSTRAINT CK_BaiLamBaiTapAI_TrangThai CHECK (TrangThaiBaiLam IN (N'in_progress', N'submitted', N'graded')),
    CONSTRAINT CK_BaiLamBaiTapAI_CauTraLoiJson CHECK (CauTraLoiJson IS NULL OR ISJSON(CauTraLoiJson) = 1),
    CONSTRAINT CK_BaiLamBaiTapAI_KetQuaChamJson CHECK (KetQuaChamJson IS NULL OR ISJSON(KetQuaChamJson) = 1)
);
GO

CREATE INDEX IX_BaiLamBaiTapAI_NguoiDungId ON dbo.BaiLamBaiTapAI(NguoiDungId);
CREATE INDEX IX_BaiLamBaiTapAI_BaiTapAIId ON dbo.BaiLamBaiTapAI(BaiTapAIId);
CREATE INDEX IX_BaiLamBaiTapAI_DiemSo ON dbo.BaiLamBaiTapAI(DiemSo);
CREATE INDEX IX_BaiLamBaiTapAI_NgayTao ON dbo.BaiLamBaiTapAI(NgayTao);
GO

select * from dbo.BaiLamDeThiAI
select * from dbo.DeThiAI

select * from dbo.BaiLamBaiTapAI
select * from dbo.BaiTapAI

select * from dbo.LoTrinhHocTapAI
select * from dbo.DiemYeuNguoiDung
select * from dbo.DiemDanhNgay

/* =========================================================
   7) ĐIỂM YẾU NGƯỜI DÙNG
   =========================================================
   Dùng để gửi cho AI khi:
   - tạo bài luyện tập
   - tạo đề thi đánh giá
   - đề xuất lộ trình học
   ========================================================= */

CREATE TABLE dbo.DiemYeuNguoiDung (
    DiemYeuNguoiDungId  INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_DiemYeuNguoiDung PRIMARY KEY,
    NguoiDungId         INT NOT NULL,
    KieuBaiTap          NVARCHAR(50) NOT NULL,
    ChuDeBaiTap         NVARCHAR(200) NULL,
    KhaNang             NVARCHAR(100) NOT NULL, -- Grammar, Vocabulary, Listening, Reading, Writing, Speaking...
    MoTaDiemYeu         NVARCHAR(500) NOT NULL,
    MucDoUuTien         TINYINT NOT NULL CONSTRAINT DF_DiemYeuNguoiDung_MucDoUuTien DEFAULT (1),
    SoLanXuatHien       INT NOT NULL CONSTRAINT DF_DiemYeuNguoiDung_SoLanXuatHien DEFAULT (0),
    SoLanSai            INT NOT NULL CONSTRAINT DF_DiemYeuNguoiDung_SoLanSai DEFAULT (0),
    DiemTrungBinh       DECIMAL(5,2) NULL,
    LanCapNhatCuoi      DATETIME2(0) NOT NULL CONSTRAINT DF_DiemYeuNguoiDung_LanCapNhatCuoi DEFAULT SYSDATETIME(),

    CONSTRAINT FK_DiemYeuNguoiDung_NguoiDung FOREIGN KEY (NguoiDungId) REFERENCES dbo.NguoiDung(NguoiDungId) ON DELETE CASCADE,
    CONSTRAINT CK_DiemYeuNguoiDung_MucDoUuTien CHECK (MucDoUuTien BETWEEN 1 AND 5),
    CONSTRAINT UQ_DiemYeuNguoiDung UNIQUE (NguoiDungId, KieuBaiTap, KhaNang, MoTaDiemYeu, ChuDeBaiTap)
);
GO

CREATE INDEX IX_DiemYeuNguoiDung_NguoiDungId ON dbo.DiemYeuNguoiDung(NguoiDungId);
CREATE INDEX IX_DiemYeuNguoiDung_KieuBaiTap ON dbo.DiemYeuNguoiDung(KieuBaiTap);
GO

/* =========================================================
   8) TIẾN ĐỘ HỌC TẬP + ĐIỂM DANH HÀNG NGÀY
   ========================================================= */

CREATE TABLE dbo.TienDoHocTap (
    TienDoHocTapId         INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_TienDoHocTap PRIMARY KEY,
    NguoiDungId            INT NOT NULL,
    TongPhutHoc            INT NOT NULL CONSTRAINT DF_TienDoHocTap_TongPhutHoc DEFAULT (0),
    TongXP                 INT NOT NULL CONSTRAINT DF_TienDoHocTap_TongXP DEFAULT (0),
    TongBaiDaLam           INT NOT NULL CONSTRAINT DF_TienDoHocTap_TongBaiDaLam DEFAULT (0),
    TongBaiHoanThanh       INT NOT NULL CONSTRAINT DF_TienDoHocTap_TongBaiHoanThanh DEFAULT (0),
    TongBaiDat             INT NOT NULL CONSTRAINT DF_TienDoHocTap_TongBaiDat DEFAULT (0),
    TongBaiKhongDat        INT NOT NULL CONSTRAINT DF_TienDoHocTap_TongBaiKhongDat DEFAULT (0),
    TongDeThiDaLam         INT NOT NULL CONSTRAINT DF_TienDoHocTap_TongDeThiDaLam DEFAULT (0),
    DiemTrungBinhDeThi     DECIMAL(5,2) NULL,
    SoNgayDiemDanhLienTiep INT NOT NULL CONSTRAINT DF_TienDoHocTap_SoNgayDiemDanhLienTiep DEFAULT (0),
    NgayDiemDanhGanNhat    DATE NULL,
    MucTieuHangNgayPhut    INT NOT NULL CONSTRAINT DF_TienDoHocTap_MucTieuHangNgayPhut DEFAULT (0),
    CapDoHienTai           NVARCHAR(20) NULL,
    CapNhatLuc             DATETIME2(0) NOT NULL CONSTRAINT DF_TienDoHocTap_CapNhatLuc DEFAULT SYSDATETIME(),

    CONSTRAINT UQ_TienDoHocTap_NguoiDung UNIQUE (NguoiDungId),
    CONSTRAINT FK_TienDoHocTap_NguoiDung FOREIGN KEY (NguoiDungId) REFERENCES dbo.NguoiDung(NguoiDungId) ON DELETE CASCADE
);
GO

CREATE TABLE dbo.DiemDanhNgay (
    DiemDanhNgayId        INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_DiemDanhNgay PRIMARY KEY,
    NguoiDungId           INT NOT NULL,
    NgayDiemDanh          DATE NOT NULL,
    SoPhutHoc             INT NOT NULL CONSTRAINT DF_DiemDanhNgay_SoPhutHoc DEFAULT (0),
    XPThuong              INT NOT NULL CONSTRAINT DF_DiemDanhNgay_XPThuong DEFAULT (0),
    CoHoanThanhMucTieu    BIT NOT NULL CONSTRAINT DF_DiemDanhNgay_CoHoanThanhMucTieu DEFAULT (0),
    GhiChu                NVARCHAR(255) NULL,
    NgayTao               DATETIME2(0) NOT NULL CONSTRAINT DF_DiemDanhNgay_NgayTao DEFAULT SYSDATETIME(),

    CONSTRAINT FK_DiemDanhNgay_NguoiDung FOREIGN KEY (NguoiDungId) REFERENCES dbo.NguoiDung(NguoiDungId) ON DELETE CASCADE,
    CONSTRAINT UQ_DiemDanhNgay UNIQUE (NguoiDungId, NgayDiemDanh),
    CONSTRAINT CK_DiemDanhNgay_SoPhutHoc CHECK (SoPhutHoc >= 0),
    CONSTRAINT CK_DiemDanhNgay_XPThuong CHECK (XPThuong >= 0)
);
GO

select * from dbo.DiemDanhNgay
select * from dbo.TienDoHocTap

CREATE INDEX IX_TienDoHocTap_NguoiDungId ON dbo.TienDoHocTap(NguoiDungId);
CREATE INDEX IX_DiemDanhNgay_NguoiDungId ON dbo.DiemDanhNgay(NguoiDungId);
CREATE INDEX IX_DiemDanhNgay_NgayDiemDanh ON dbo.DiemDanhNgay(NgayDiemDanh);
GO

/* =========================================================
   9) LỘ TRÌNH HỌC TẬP AI
   ========================================================= */

CREATE TABLE dbo.LoTrinhHocTapAI (
    LoTrinhHocTapAIId    INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_LoTrinhHocTapAI PRIMARY KEY,
    NguoiDungId          INT NOT NULL,
    TenLoTrinh           NVARCHAR(200) NOT NULL,
    DuLieuJson           NVARCHAR(MAX) NOT NULL,
    TrangThai            NVARCHAR(20) NOT NULL CONSTRAINT DF_LoTrinhHocTapAI_TrangThai DEFAULT N'active',
    NgayTao              DATETIME2(0) NOT NULL CONSTRAINT DF_LoTrinhHocTapAI_NgayTao DEFAULT SYSDATETIME(),
    NgayCapNhat          DATETIME2(0) NOT NULL CONSTRAINT DF_LoTrinhHocTapAI_NgayCapNhat DEFAULT SYSDATETIME(),

    CONSTRAINT FK_LoTrinhHocTapAI_NguoiDung FOREIGN KEY (NguoiDungId) REFERENCES dbo.NguoiDung(NguoiDungId) ON DELETE CASCADE,
    CONSTRAINT CK_LoTrinhHocTapAI_TrangThai CHECK (TrangThai IN (N'active', N'archived', N'completed')),
    CONSTRAINT CK_LoTrinhHocTapAI_DuLieuJson CHECK (ISJSON(DuLieuJson) = 1)
);
GO

CREATE INDEX IX_LoTrinhHocTapAI_NguoiDungId ON dbo.LoTrinhHocTapAI(NguoiDungId);
CREATE INDEX IX_LoTrinhHocTapAI_NgayTao ON dbo.LoTrinhHocTapAI(NgayTao);
GO

/* =========================================================
   10) GÓI ĐĂNG KÝ / THANH TOÁN
   ========================================================= */

CREATE TABLE dbo.GoiDangKy (
    GoiDangKyId      INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_GoiDangKy PRIMARY KEY,
    TenGoi           NVARCHAR(100) NOT NULL,
    MoTa             NVARCHAR(MAX) NULL,
    Gia              DECIMAL(10,2) NOT NULL,
    ThoiHanThang     INT NULL,
    LaTronDoi        BIT NOT NULL CONSTRAINT DF_GoiDangKy_LaTronDoi DEFAULT (0),
    DangSuDung       BIT NOT NULL CONSTRAINT DF_GoiDangKy_DangSuDung DEFAULT (1),
    NgayTao          DATETIME2(0) NOT NULL CONSTRAINT DF_GoiDangKy_NgayTao DEFAULT SYSDATETIME()
);
GO

CREATE TABLE dbo.ThanhToan (
    ThanhToanId             INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_ThanhToan PRIMARY KEY,
    NguoiDungId             INT NOT NULL,
    GoiDangKyId             INT NOT NULL,
    SoTien                  DECIMAL(10,2) NOT NULL,
    PhuongThucThanhToan     NVARCHAR(50) NULL,
    TrangThaiThanhToan      NVARCHAR(20) NOT NULL CONSTRAINT DF_ThanhToan_TrangThai DEFAULT N'pending',
    MaGiaoDich              NVARCHAR(100) NULL,
    ChiTietThanhToanJson    NVARCHAR(MAX) NULL,
    NgayTao                 DATETIME2(0) NOT NULL CONSTRAINT DF_ThanhToan_NgayTao DEFAULT SYSDATETIME(),

    CONSTRAINT FK_ThanhToan_NguoiDung FOREIGN KEY (NguoiDungId) REFERENCES dbo.NguoiDung(NguoiDungId) ON DELETE CASCADE,
    CONSTRAINT FK_ThanhToan_GoiDangKy FOREIGN KEY (GoiDangKyId) REFERENCES dbo.GoiDangKy(GoiDangKyId) ON DELETE NO ACTION,
    CONSTRAINT CK_ThanhToan_TrangThai CHECK (TrangThaiThanhToan IN (N'pending', N'completed', N'failed', N'cancelled')),
    CONSTRAINT CK_ThanhToan_ChiTietThanhToanJson CHECK (ChiTietThanhToanJson IS NULL OR ISJSON(ChiTietThanhToanJson) = 1)
);
GO

CREATE INDEX IX_ThanhToan_NguoiDungId ON dbo.ThanhToan(NguoiDungId);
CREATE INDEX IX_ThanhToan_GoiDangKyId ON dbo.ThanhToan(GoiDangKyId);
CREATE INDEX IX_ThanhToan_TrangThaiThanhToan ON dbo.ThanhToan(TrangThaiThanhToan);
GO

/* =========================================================
   11) TỪ VỰNG / TỪ ĐIỂN
   ========================================================= */

CREATE TABLE dbo.TuDienTuVung (
    TuDienTuVungId   INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_TuDienTuVung PRIMARY KEY,
    TuVung           NVARCHAR(100) NOT NULL,
    Nghia            NVARCHAR(MAX) NOT NULL,
    ViDu             NVARCHAR(MAX) NULL,
    LoaiTu           NVARCHAR(50) NULL,
    AudioUrl         NVARCHAR(255) NULL,
    NgayTao          DATETIME2(0) NOT NULL CONSTRAINT DF_TuDienTuVung_NgayTao DEFAULT SYSDATETIME(),

    CONSTRAINT UQ_TuDienTuVung_TuVung UNIQUE (TuVung)
);
GO

CREATE INDEX IX_TuDienTuVung_TuVung ON dbo.TuDienTuVung(TuVung);
GO

/* =========================================================
   12) GỢI Ý DỮ LIỆU MẪU
   ========================================================= */

/*
-- Nếu muốn thêm bài tập mẫu:
INSERT INTO dbo.BaiTapAI (NguoiDungId, KieuBaiTap, ChuDeBaiTap, TrinhDo, NoiDungJson)
VALUES
(1, N'listening', N'du lịch', N'A2', N'{"title":"Listening practice","questions":[{"id":1,"text":"..."}]}');

-- Nếu muốn thêm đề thi mẫu:
INSERT INTO dbo.DeThiAI (NguoiDungId, TenDeThi, KieuDeThi, LanThu, TrinhDoMucTieu, TongSoPhanDuKien, TongSoBaiTapDuKien, DuLieuTongQuanJson)
VALUES
(1, N'Đề đánh giá trình độ đầu vào', N'placement', 1, N'A2', 4, 20, N'{"timeLimit":45,"goal":"placement"}');
GO
*/