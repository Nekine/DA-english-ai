/* =========================================================
   SQL Server schema v3 cho hệ thống học tiếng Anh cá nhân hoá
   Cập nhật theo yêu cầu:
   - Thêm LoaiTaiKhoan cho TaiKhoan
   - Thêm TrinhDoHienTai cho NguoiDung
   - Bỏ bảng LoaiBaiTapAI và ChuDeHocTap
   - Gộp phần đề thi và chấm điểm theo hướng: DeThiAI -> PhanDeThiAI -> BaiTapPhanDeThiAI
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
   4) ĐỀ THI AI (ĐÁNH GIÁ TRÌNH ĐỘ / CÁC ĐỀ SAU / LUYỆN TẬP)
   =========================================================
   Thiết kế theo kiểu:
   DeThiAI (đề + phần làm + chấm tổng) -> PhanDeThiAI (từng phần, có dữ liệu AI + kết quả phần)
   -> BaiTapPhanDeThiAI (từng câu/bài trong phần)
   ========================================================= */

CREATE TABLE dbo.DeThiAI (
    DeThiAIId             INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_DeThiAI PRIMARY KEY,
    NguoiDungId           INT NOT NULL,
    TenDeThi              NVARCHAR(200) NOT NULL,
    KieuDeThi             NVARCHAR(30) NOT NULL CONSTRAINT DF_DeThiAI_KieuDeThi DEFAULT N'placement',
    LanThu                INT NOT NULL CONSTRAINT DF_DeThiAI_LanThu DEFAULT (1),
    TrinhDoMucTieu        NVARCHAR(20) NULL,
    TongSoPhanDuKien      INT NULL,
    TongSoBaiTapDuKien    INT NULL,
    DuLieuTongQuanJson    NVARCHAR(MAX) NULL,
    CauTraLoiTongJson     NVARCHAR(MAX) NULL,
    KetQuaChamTongJson    NVARCHAR(MAX) NULL,
    TongSoCau             INT NULL,
    SoCauDung             INT NULL,
    SoCauSai              INT NULL,
    DiemSo                DECIMAL(5,2) NULL,
    ThoiGianBatDau        DATETIME2(0) NULL,
    ThoiGianHoanThanh     DATETIME2(0) NULL,
    ThoiGianLamPhut       INT NULL,
    TrangThaiDeThi        NVARCHAR(20) NOT NULL CONSTRAINT DF_DeThiAI_TrangThai DEFAULT N'draft',
    NhanXetAI             NVARCHAR(MAX) NULL,
    NhanDinhTrinhDoAI     NVARCHAR(20) NULL,
    NgayTao               DATETIME2(0) NOT NULL CONSTRAINT DF_DeThiAI_NgayTao DEFAULT SYSDATETIME(),
    NgayCapNhat           DATETIME2(0) NOT NULL CONSTRAINT DF_DeThiAI_NgayCapNhat DEFAULT SYSDATETIME(),

    CONSTRAINT FK_DeThiAI_NguoiDung FOREIGN KEY (NguoiDungId) REFERENCES dbo.NguoiDung(NguoiDungId) ON DELETE CASCADE,
    CONSTRAINT CK_DeThiAI_KieuDeThi CHECK (KieuDeThi IN (N'placement', N'followup', N'practice')),
    CONSTRAINT CK_DeThiAI_TrangThai CHECK (TrangThaiDeThi IN (N'draft', N'partial', N'completed', N'archived')),
    CONSTRAINT CK_DeThiAI_DuLieuTongQuanJson CHECK (DuLieuTongQuanJson IS NULL OR ISJSON(DuLieuTongQuanJson) = 1),
    CONSTRAINT CK_DeThiAI_CauTraLoiTongJson CHECK (CauTraLoiTongJson IS NULL OR ISJSON(CauTraLoiTongJson) = 1),
    CONSTRAINT CK_DeThiAI_KetQuaChamTongJson CHECK (KetQuaChamTongJson IS NULL OR ISJSON(KetQuaChamTongJson) = 1),
    CONSTRAINT CK_DeThiAI_TongSoPhanDuKien CHECK (TongSoPhanDuKien IS NULL OR TongSoPhanDuKien >= 0),
    CONSTRAINT CK_DeThiAI_TongSoBaiTapDuKien CHECK (TongSoBaiTapDuKien IS NULL OR TongSoBaiTapDuKien >= 0),
    CONSTRAINT CK_DeThiAI_NhanDinhTrinhDoAI CHECK (NhanDinhTrinhDoAI IS NULL OR NhanDinhTrinhDoAI IN (N'A1', N'A2', N'B1', N'B2', N'C1', N'C2')),
    CONSTRAINT UQ_DeThiAI UNIQUE (NguoiDungId, KieuDeThi, LanThu)
);
GO

CREATE INDEX IX_DeThiAI_NguoiDungId ON dbo.DeThiAI(NguoiDungId);
CREATE INDEX IX_DeThiAI_KieuDeThi ON dbo.DeThiAI(KieuDeThi);
CREATE INDEX IX_DeThiAI_NgayTao ON dbo.DeThiAI(NgayTao);
GO

CREATE TABLE dbo.PhanDeThiAI (
    PhanDeThiAIId         INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_PhanDeThiAI PRIMARY KEY,
    DeThiAIId             INT NOT NULL,
    SoThuTuPhan           INT NOT NULL,
    TenPhan               NVARCHAR(200) NOT NULL,
    KienThucChinh         NVARCHAR(100) NULL,    -- ví dụ: listening, reading, writing, speaking, grammar...
    MoTaPhan              NVARCHAR(500) NULL,
    DuLieuPhanJson        NVARCHAR(MAX) NOT NULL, -- dữ liệu do AI tạo cho phần này
    CauTraLoiPhanJson     NVARCHAR(MAX) NULL,     -- câu trả lời của người dùng ở phần này
    KetQuaChamPhanJson    NVARCHAR(MAX) NULL,     -- kết quả chấm chi tiết cho phần này
    TongSoCau             INT NULL,
    SoCauDung             INT NULL,
    SoCauSai              INT NULL,
    DiemPhan              DECIMAL(5,2) NULL,
    TrangThaiPhan         NVARCHAR(20) NOT NULL CONSTRAINT DF_PhanDeThiAI_TrangThai DEFAULT N'generated',
    NhanXetAI             NVARCHAR(MAX) NULL,
    NgayTao               DATETIME2(0) NOT NULL CONSTRAINT DF_PhanDeThiAI_NgayTao DEFAULT SYSDATETIME(),
    NgayCapNhat           DATETIME2(0) NOT NULL CONSTRAINT DF_PhanDeThiAI_NgayCapNhat DEFAULT SYSDATETIME(),

    CONSTRAINT FK_PhanDeThiAI_DeThiAI FOREIGN KEY (DeThiAIId) REFERENCES dbo.DeThiAI(DeThiAIId) ON DELETE CASCADE,
    CONSTRAINT UQ_PhanDeThiAI UNIQUE (DeThiAIId, SoThuTuPhan),
    CONSTRAINT CK_PhanDeThiAI_TrangThai CHECK (TrangThaiPhan IN (N'pending', N'generated', N'in_progress', N'submitted', N'graded', N'archived')),
    CONSTRAINT CK_PhanDeThiAI_DuLieuPhanJson CHECK (ISJSON(DuLieuPhanJson) = 1),
    CONSTRAINT CK_PhanDeThiAI_CauTraLoiPhanJson CHECK (CauTraLoiPhanJson IS NULL OR ISJSON(CauTraLoiPhanJson) = 1),
    CONSTRAINT CK_PhanDeThiAI_KetQuaChamPhanJson CHECK (KetQuaChamPhanJson IS NULL OR ISJSON(KetQuaChamPhanJson) = 1),
    CONSTRAINT CK_PhanDeThiAI_SoThuTuPhan CHECK (SoThuTuPhan > 0),
    CONSTRAINT CK_PhanDeThiAI_TongSoCau CHECK (TongSoCau IS NULL OR TongSoCau >= 0),
    CONSTRAINT CK_PhanDeThiAI_SoCauDung CHECK (SoCauDung IS NULL OR SoCauDung >= 0),
    CONSTRAINT CK_PhanDeThiAI_SoCauSai CHECK (SoCauSai IS NULL OR SoCauSai >= 0)
);
GO

CREATE INDEX IX_PhanDeThiAI_DeThiAIId ON dbo.PhanDeThiAI(DeThiAIId);
CREATE INDEX IX_PhanDeThiAI_KienThucChinh ON dbo.PhanDeThiAI(KienThucChinh);
GO

CREATE TABLE dbo.BaiTapPhanDeThiAI (
    BaiTapPhanDeThiAIId   INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_BaiTapPhanDeThiAI PRIMARY KEY,
    PhanDeThiAIId         INT NOT NULL,
    SoThuTuBaiTap         INT NOT NULL,
    KieuBaiTap            NVARCHAR(50) NOT NULL,
    NoiDungJson           NVARCHAR(MAX) NOT NULL,   -- nội dung câu hỏi/bài tập trong phần
    DapAnJson             NVARCHAR(MAX) NULL,       -- đáp án đúng / key chấm
    GiaiThichJson         NVARCHAR(MAX) NULL,       -- giải thích chi tiết nếu có
    TrangThaiBaiTap       NVARCHAR(20) NOT NULL CONSTRAINT DF_BaiTapPhanDeThiAI_TrangThai DEFAULT N'generated',
    NgayTao               DATETIME2(0) NOT NULL CONSTRAINT DF_BaiTapPhanDeThiAI_NgayTao DEFAULT SYSDATETIME(),
    NgayCapNhat           DATETIME2(0) NOT NULL CONSTRAINT DF_BaiTapPhanDeThiAI_NgayCapNhat DEFAULT SYSDATETIME(),

    CONSTRAINT FK_BaiTapPhanDeThiAI_PhanDeThiAI FOREIGN KEY (PhanDeThiAIId) REFERENCES dbo.PhanDeThiAI(PhanDeThiAIId) ON DELETE CASCADE,
    CONSTRAINT UQ_BaiTapPhanDeThiAI UNIQUE (PhanDeThiAIId, SoThuTuBaiTap),
    CONSTRAINT CK_BaiTapPhanDeThiAI_TrangThai CHECK (TrangThaiBaiTap IN (N'pending', N'generated', N'archived')),
    CONSTRAINT CK_BaiTapPhanDeThiAI_NoiDungJson CHECK (ISJSON(NoiDungJson) = 1),
    CONSTRAINT CK_BaiTapPhanDeThiAI_DapAnJson CHECK (DapAnJson IS NULL OR ISJSON(DapAnJson) = 1),
    CONSTRAINT CK_BaiTapPhanDeThiAI_GiaiThichJson CHECK (GiaiThichJson IS NULL OR ISJSON(GiaiThichJson) = 1),
    CONSTRAINT CK_BaiTapPhanDeThiAI_SoThuTuBaiTap CHECK (SoThuTuBaiTap > 0)
);
GO

CREATE INDEX IX_BaiTapPhanDeThiAI_PhanDeThiAIId ON dbo.BaiTapPhanDeThiAI(PhanDeThiAIId);
CREATE INDEX IX_BaiTapPhanDeThiAI_KieuBaiTap ON dbo.BaiTapPhanDeThiAI(KieuBaiTap);
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

select * from dbo.BaiLamBaiTapAI

CREATE INDEX IX_BaiLamBaiTapAI_NguoiDungId ON dbo.BaiLamBaiTapAI(NguoiDungId);
CREATE INDEX IX_BaiLamBaiTapAI_BaiTapAIId ON dbo.BaiLamBaiTapAI(BaiTapAIId);
CREATE INDEX IX_BaiLamBaiTapAI_DiemSo ON dbo.BaiLamBaiTapAI(DiemSo);
CREATE INDEX IX_BaiLamBaiTapAI_NgayTao ON dbo.BaiLamBaiTapAI(NgayTao);
GO

CREATE TABLE dbo.ChiTietChamBaiBaiTapAI (
    ChiTietChamBaiBaiTapAIId INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_ChiTietChamBaiBaiTapAI PRIMARY KEY,
    BaiLamBaiTapAIId        INT NOT NULL,
    SoThuTuCauHoi           INT NOT NULL,
    KieuCauHoi              NVARCHAR(50) NULL,
    CauTraLoiNguoiDung      NVARCHAR(MAX) NULL,
    DapAnDung               NVARCHAR(MAX) NULL,
    DungSai                 BIT NULL,
    Diem                    DECIMAL(5,2) NULL,
    GhiChuAI                NVARCHAR(MAX) NULL,
    NgayTao                 DATETIME2(0) NOT NULL CONSTRAINT DF_ChiTietChamBaiBaiTapAI_NgayTao DEFAULT SYSDATETIME(),

    CONSTRAINT FK_ChiTietChamBaiBaiTapAI_BaiLam FOREIGN KEY (BaiLamBaiTapAIId) REFERENCES dbo.BaiLamBaiTapAI(BaiLamBaiTapAIId) ON DELETE CASCADE,
    CONSTRAINT UQ_ChiTietChamBaiBaiTapAI UNIQUE (BaiLamBaiTapAIId, SoThuTuCauHoi)
);
GO

CREATE INDEX IX_ChiTietChamBaiBaiTapAI_BaiLamBaiTapAIId ON dbo.ChiTietChamBaiBaiTapAI(BaiLamBaiTapAIId);
GO


/* =========================================================
    BÀI LÀM + CHẤM ĐIỂM CHO Bài làm đề thi
   ========================================================= */

IF OBJECT_ID(N'dbo.BaiLamDeThiAI', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.BaiLamDeThiAI (
        BaiLamDeThiAIId      INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_BaiLamDeThiAI PRIMARY KEY,
        DeThiAIId            INT NOT NULL,
        NguoiDungId          INT NOT NULL,
        LanThu               INT NOT NULL CONSTRAINT DF_BaiLamDeThiAI_LanThu DEFAULT (1),

        CauTraLoiTongJson    NVARCHAR(MAX) NULL,
        KetQuaChamTongJson    NVARCHAR(MAX) NULL,

        TongSoCau            INT NULL,
        SoCauDung            INT NULL,
        SoCauSai             INT NULL,
        DiemSo               DECIMAL(5,2) NULL,

        TrinhDoNhanDinhAI    NVARCHAR(20) NULL,

        ThoiGianBatDau       DATETIME2(0) NULL,
        ThoiGianHoanThanh    DATETIME2(0) NULL,
        ThoiGianLamPhut      INT NULL,

        TrangThaiBaiLam      NVARCHAR(20) NOT NULL CONSTRAINT DF_BaiLamDeThiAI_TrangThai DEFAULT N'in_progress',
        NhanXetAI            NVARCHAR(MAX) NULL,
        NgayTao              DATETIME2(0) NOT NULL CONSTRAINT DF_BaiLamDeThiAI_NgayTao DEFAULT SYSDATETIME(),

        CONSTRAINT FK_BaiLamDeThiAI_DeThiAI 
            FOREIGN KEY (DeThiAIId) 
            REFERENCES dbo.DeThiAI(DeThiAIId) 
            ON DELETE CASCADE,

        CONSTRAINT FK_BaiLamDeThiAI_NguoiDung 
            FOREIGN KEY (NguoiDungId) 
            REFERENCES dbo.NguoiDung(NguoiDungId) 
            ON DELETE NO ACTION,

        CONSTRAINT UQ_BaiLamDeThiAI 
            UNIQUE (NguoiDungId, DeThiAIId, LanThu),

        CONSTRAINT CK_BaiLamDeThiAI_TrangThai 
            CHECK (TrangThaiBaiLam IN (N'in_progress', N'submitted', N'graded')),

        CONSTRAINT CK_BaiLamDeThiAI_CauTraLoiTongJson 
            CHECK (CauTraLoiTongJson IS NULL OR ISJSON(CauTraLoiTongJson) = 1),

        CONSTRAINT CK_BaiLamDeThiAI_KetQuaChamTongJson 
            CHECK (KetQuaChamTongJson IS NULL OR ISJSON(KetQuaChamTongJson) = 1)
    );
END
GO

select * from BaiLamDeThiAI
IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = N'IX_BaiLamDeThiAI_DeThiAIId'
      AND object_id = OBJECT_ID(N'dbo.BaiLamDeThiAI')
)
BEGIN
    CREATE INDEX IX_BaiLamDeThiAI_DeThiAIId ON dbo.BaiLamDeThiAI(DeThiAIId);
END
GO

IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = N'IX_BaiLamDeThiAI_NguoiDungId'
      AND object_id = OBJECT_ID(N'dbo.BaiLamDeThiAI')
)
BEGIN
    CREATE INDEX IX_BaiLamDeThiAI_NguoiDungId ON dbo.BaiLamDeThiAI(NguoiDungId);
END
GO

IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = N'IX_BaiLamDeThiAI_TrangThai'
      AND object_id = OBJECT_ID(N'dbo.BaiLamDeThiAI')
)
BEGIN
    CREATE INDEX IX_BaiLamDeThiAI_TrangThai ON dbo.BaiLamDeThiAI(TrangThaiBaiLam);
END
GO

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
   BẢNG XẾP HẠNG
   ========================================================= */

IF OBJECT_ID(N'dbo.BangXepHang', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.BangXepHang (
        BangXepHangId     INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_BangXepHang PRIMARY KEY,
        TenBangXepHang    NVARCHAR(200) NOT NULL,
        KieuBangXepHang   NVARCHAR(20) NOT NULL,  -- daily, weekly, monthly, all_time, custom
        NgayBatDau        DATE NULL,
        NgayKetThuc       DATE NULL,
        MoTa              NVARCHAR(500) NULL,
        CongThucJson      NVARCHAR(MAX) NULL,     -- công thức tính điểm / quy tắc xếp hạng
        TrangThai         NVARCHAR(20) NOT NULL CONSTRAINT DF_BangXepHang_TrangThai DEFAULT N'active',
        NgayTao           DATETIME2(0) NOT NULL CONSTRAINT DF_BangXepHang_NgayTao DEFAULT SYSDATETIME(),
        NgayCapNhat       DATETIME2(0) NOT NULL CONSTRAINT DF_BangXepHang_NgayCapNhat DEFAULT SYSDATETIME(),

        CONSTRAINT CK_BangXepHang_KieuBangXepHang CHECK (KieuBangXepHang IN (N'daily', N'weekly', N'monthly', N'all_time', N'custom')),
        CONSTRAINT CK_BangXepHang_TrangThai CHECK (TrangThai IN (N'active', N'inactive', N'archived')),
        CONSTRAINT CK_BangXepHang_CongThucJson CHECK (CongThucJson IS NULL OR ISJSON(CongThucJson) = 1)
    );
END
GO

IF OBJECT_ID(N'dbo.ChiTietBangXepHang', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.ChiTietBangXepHang (
        ChiTietBangXepHangId INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_ChiTietBangXepHang PRIMARY KEY,
        BangXepHangId        INT NOT NULL,
        NguoiDungId          INT NOT NULL,
        HangXep              INT NULL,
        DiemXepHang          DECIMAL(12,2) NOT NULL CONSTRAINT DF_ChiTietBangXepHang_DiemXepHang DEFAULT (0),
        TongXP               INT NOT NULL CONSTRAINT DF_ChiTietBangXepHang_TongXP DEFAULT (0),
        TongPhutHoc          INT NOT NULL CONSTRAINT DF_ChiTietBangXepHang_TongPhutHoc DEFAULT (0),
        TongBaiHoanThanh     INT NOT NULL CONSTRAINT DF_ChiTietBangXepHang_TongBaiHoanThanh DEFAULT (0),
        TongDeThiDaLam       INT NOT NULL CONSTRAINT DF_ChiTietBangXepHang_TongDeThiDaLam DEFAULT (0),
        SoNgayDiemDanhLienTiep INT NOT NULL CONSTRAINT DF_ChiTietBangXepHang_SoNgayDiemDanhLienTiep DEFAULT (0),
        CapDoHienTai         NVARCHAR(20) NULL,
        ThongSoBoSungJson    NVARCHAR(MAX) NULL,
        NgayCapNhat          DATETIME2(0) NOT NULL CONSTRAINT DF_ChiTietBangXepHang_NgayCapNhat DEFAULT SYSDATETIME(),

        CONSTRAINT FK_ChiTietBangXepHang_BangXepHang FOREIGN KEY (BangXepHangId) REFERENCES dbo.BangXepHang(BangXepHangId) ON DELETE CASCADE,
        CONSTRAINT FK_ChiTietBangXepHang_NguoiDung FOREIGN KEY (NguoiDungId) REFERENCES dbo.NguoiDung(NguoiDungId) ON DELETE CASCADE,
        CONSTRAINT UQ_ChiTietBangXepHang UNIQUE (BangXepHangId, NguoiDungId),
        CONSTRAINT CK_ChiTietBangXepHang_HangXep CHECK (HangXep IS NULL OR HangXep >= 1),
        CONSTRAINT CK_ChiTietBangXepHang_DiemXepHang CHECK (DiemXepHang >= 0),
        CONSTRAINT CK_ChiTietBangXepHang_ThongSoBoSungJson CHECK (ThongSoBoSungJson IS NULL OR ISJSON(ThongSoBoSungJson) = 1)
    );
END
GO

CREATE INDEX IX_BangXepHang_KieuBangXepHang ON dbo.BangXepHang(KieuBangXepHang);
CREATE INDEX IX_BangXepHang_TrangThai ON dbo.BangXepHang(TrangThai);
CREATE INDEX IX_BangXepHang_NgayBatDau_NgayKetThuc ON dbo.BangXepHang(NgayBatDau, NgayKetThuc);

CREATE INDEX IX_ChiTietBangXepHang_BangXepHangId ON dbo.ChiTietBangXepHang(BangXepHangId);
CREATE INDEX IX_ChiTietBangXepHang_NguoiDungId ON dbo.ChiTietBangXepHang(NguoiDungId);
CREATE INDEX IX_ChiTietBangXepHang_DiemXepHang ON dbo.ChiTietBangXepHang(BangXepHangId, DiemXepHang DESC, TongXP DESC, TongPhutHoc DESC);
GO