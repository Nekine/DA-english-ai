import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Building2, CheckCircle2, ArrowLeft, QrCode, Copy } from "lucide-react";
import { toast } from "sonner";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/components/AuthContext";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type BillingCycle = "1month" | "6months" | "1year";
type PlanTier = "pre" | "max";

type CheckoutPlan = {
  price: number;
  vat: number;
  total: number;
  label: string;
  displayPrice: string;
  monthlyEquivalent: string;
  note: string;
  discountText?: string;
  originalPrice?: number;
};

const parseTier = (value: string | null): PlanTier => {
  if (value === "max") {
    return "max";
  }
  return "pre";
};

const parseCycle = (value: string | null): BillingCycle => {
  if (value === "6months" || value === "1year") {
    return value;
  }
  return "1month";
};

const Checkout = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();

  const initialTier = parseTier(searchParams.get("tier"));
  const initialCycle = parseCycle(searchParams.get("cycle"));

  const [isProcessing, setIsProcessing] = useState(false);
  const [showQRDialog, setShowQRDialog] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const [selectedTier, setSelectedTier] = useState<PlanTier>(initialTier);
  const [selectedCycle, setSelectedCycle] = useState<BillingCycle>(initialCycle);
  const [customerInfo, setCustomerInfo] = useState({
    fullName: "",
    email: "",
    phone: "",
  });

  // Auto-fill email from user data
  useEffect(() => {
    if (user?.email) {
      setCustomerInfo(prev => ({
        ...prev,
        email: user.email || ""
      }));
    }
  }, [user]);

  const cycleOptions: Array<{ value: BillingCycle; label: string }> = [
    { value: "1month", label: "1 Tháng" },
    { value: "6months", label: "6 Tháng" },
    { value: "1year", label: "1 Năm" },
  ];

  const planMatrix: Record<PlanTier, Record<BillingCycle, CheckoutPlan>> = {
    pre: {
      "1month": {
        price: 199000,
        vat: 19900,
        total: 218900,
        label: "1 tháng",
        displayPrice: "199.000đ",
        monthlyEquivalent: "199.000đ/tháng",
        note: "Gói Pre tiêu chuẩn",
      },
      "6months": {
        price: 999000,
        vat: 99900,
        total: 1098900,
        label: "6 tháng",
        displayPrice: "999.000đ",
        monthlyEquivalent: "166.500đ/tháng",
        note: "Tiết kiệm 16%",
        discountText: "Giảm 16%",
        originalPrice: 1194000,
      },
      "1year": {
        price: 1899000,
        vat: 189900,
        total: 2088900,
        label: "1 năm",
        displayPrice: "1.899.000đ",
        monthlyEquivalent: "158.250đ/tháng",
        note: "Tiết kiệm 20%",
        discountText: "Giảm 20%",
        originalPrice: 2388000,
      },
    },
    max: {
      "1month": {
        price: 299000,
        vat: 29900,
        total: 328900,
        label: "1 tháng",
        displayPrice: "299.000đ",
        monthlyEquivalent: "299.000đ/tháng",
        note: "Không giới hạn bài tập và đề thi",
      },
      "6months": {
        price: 1499000,
        vat: 149900,
        total: 1648900,
        label: "6 tháng",
        displayPrice: "1.499.000đ",
        monthlyEquivalent: "249.833đ/tháng",
        note: "Không giới hạn bài tập và đề thi",
        discountText: "Giảm 16%",
        originalPrice: 1794000,
      },
      "1year": {
        price: 2799000,
        vat: 279900,
        total: 3078900,
        label: "1 năm",
        displayPrice: "2.799.000đ",
        monthlyEquivalent: "233.250đ/tháng",
        note: "Không giới hạn bài tập và đề thi",
        discountText: "Giảm 22%",
        originalPrice: 3588000,
      },
    },
  };

  const currentPlan = planMatrix[selectedTier][selectedCycle];
  const planName = selectedTier === "max" ? "Max" : "Pre";

  const handleSelectTier = (tier: PlanTier) => {
    setSelectedTier(tier);
    setSearchParams({ tier, cycle: selectedCycle });
  };

  const handleSelectCycle = (cycle: BillingCycle) => {
    setSelectedCycle(cycle);
    setSearchParams({ tier: selectedTier, cycle });
  };

  // Bank information
  const bankInfo = {
    bankId: "970407", // Techcombank bank code
    accountNo: "999914052004",
    accountName: "LE TRUNG KIEN",
    amount: currentPlan.total,
  };

  // Generate VietQR code URL
  const generateQRCode = (transferContent: string) => {
    const { bankId, accountNo, accountName, amount } = bankInfo;
    
    // VietQR format: https://img.vietqr.io/image/{BANK_ID}-{ACCOUNT_NO}-{TEMPLATE}.png?amount={AMOUNT}&addInfo={CONTENT}&accountName={ACCOUNT_NAME}
    const qrUrl = `https://img.vietqr.io/image/${bankId}-${accountNo}-compact2.png?amount=${amount}&addInfo=${encodeURIComponent(transferContent)}&accountName=${encodeURIComponent(accountName)}`;
    
    return qrUrl;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const formData = new FormData(e.target as HTMLFormElement);
    const fullName = (formData.get("fullName") as string || "").trim();
    const email = (formData.get("email") as string || "").trim();
    const phone = (formData.get("phone") as string || "").trim();

    // Validate form
    if (!fullName || !email || !phone) {
      toast.error("Vui lòng điền đầy đủ thông tin!");
      return;
    }

    // Update customer info
    setCustomerInfo({ fullName, email, phone });

    // Generate transfer content: Name + Email (shorter format)
    const transferContent = `${fullName} ${email} ${planName}-${currentPlan.label}`;
    const qrUrl = generateQRCode(transferContent);
    setQrCodeUrl(qrUrl);
    setShowQRDialog(true);
  };

  const handleCopyAccountInfo = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Đã sao chép!");
  };

  return (
    <div className="min-h-screen bg-gradient-soft">
      <main className="container mx-auto px-4 py-12">
        <div className="max-w-5xl mx-auto">
          <Button
            variant="ghost"
            onClick={() => navigate("/pricing")}
            className="mb-6"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Quay lại
          </Button>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Payment Form */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-2xl">Thông tin thanh toán</CardTitle>
                  <CardDescription>
                    Hoàn tất thanh toán để kích hoạt tài khoản {planName}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Plan Selection */}
                    <div className="space-y-4">
                      <h3 className="font-semibold text-lg">Chọn gói đăng ký</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <button
                          type="button"
                          onClick={() => handleSelectTier("pre")}
                          className={`p-4 rounded-lg border-2 transition-all text-left ${
                            selectedTier === "pre"
                              ? "border-primary bg-primary/10"
                              : "border-border hover:border-primary/50"
                          }`}
                        >
                          <div className="text-lg font-bold">Gói Pre</div>
                          <div className="text-sm text-muted-foreground mt-1">15 bài tập/ngày, 10 đề thi/tháng</div>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSelectTier("max")}
                          className={`p-4 rounded-lg border-2 transition-all text-left ${
                            selectedTier === "max"
                              ? "border-primary bg-primary/10"
                              : "border-border hover:border-primary/50"
                          }`}
                        >
                          <div className="text-lg font-bold">Gói Max</div>
                          <div className="text-sm text-muted-foreground mt-1">Không giới hạn bài tập và đề thi</div>
                        </button>
                      </div>

                      <div className="grid md:grid-cols-3 gap-4">
                        {cycleOptions.map((cycle) => {
                          const optionPlan = planMatrix[selectedTier][cycle.value];

                          return (
                            <button
                              key={cycle.value}
                              type="button"
                              onClick={() => handleSelectCycle(cycle.value)}
                              className={`p-4 rounded-lg border-2 transition-all relative ${
                                selectedCycle === cycle.value
                                  ? "border-primary bg-primary/10"
                                  : "border-border hover:border-primary/50"
                              }`}
                            >
                              {optionPlan.discountText && (
                                <div className="absolute -top-2 -right-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full font-semibold">
                                  {optionPlan.discountText}
                                </div>
                              )}
                              <div className="text-lg font-bold">{cycle.label}</div>
                              <div className="text-2xl font-bold text-primary mt-2">{optionPlan.displayPrice}</div>
                              <div className="text-sm text-muted-foreground mt-1">{optionPlan.monthlyEquivalent}</div>
                            </button>
                          );
                        })}
                      </div>

                      {currentPlan.originalPrice && (
                        <p className="text-sm text-muted-foreground">
                          Giá gốc: <span className="line-through">{currentPlan.originalPrice.toLocaleString("vi-VN")}đ</span>
                        </p>
                      )}
                    </div>

                    <Separator />

                    {/* Customer Information */}
                    <div className="space-y-4">
                      <h3 className="font-semibold text-lg">Thông tin khách hàng</h3>
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="fullName">Họ và tên *</Label>
                          <Input
                            id="fullName"
                            name="fullName"
                            placeholder="Nguyễn Văn A"
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="email">Email *</Label>
                          <Input
                            id="email"
                            name="email"
                            type="email"
                            placeholder="example@email.com"
                            value={customerInfo.email}
                            onChange={(e) => setCustomerInfo(prev => ({ ...prev, email: e.target.value }))}
                            readOnly={!!user?.email}
                            className={user?.email ? "bg-muted cursor-not-allowed" : ""}
                            required
                          />
                          {user?.email && (
                            <p className="text-xs text-muted-foreground">
                              Email tự động lấy từ tài khoản của bạn
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="phone">Số điện thoại *</Label>
                        <Input
                          id="phone"
                          name="phone"
                          type="tel"
                          placeholder="0912345678"
                          required
                        />
                      </div>
                    </div>

                    <Separator />

                    {/* Payment Method */}
                    <div className="space-y-4">
                      <h3 className="font-semibold text-lg">Phương thức thanh toán</h3>
                      <div className="flex items-center gap-4 p-4 rounded-lg border-2 border-primary bg-accent">
                        <Building2 className="w-6 h-6 text-primary" />
                        <div className="flex-1">
                          <div className="font-semibold">Chuyển khoản ngân hàng</div>
                          <div className="text-sm text-muted-foreground">
                            Chuyển khoản qua ATM/Internet Banking hoặc quét mã QR
                          </div>
                        </div>
                      </div>
                    </div>

                    <Button
                      type="submit"
                      size="lg"
                      className="w-full"
                      disabled={isProcessing}
                    >
                      {isProcessing ? "Đang xử lý..." : "Tạo mã QR thanh toán"}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-1">
              <Card className="sticky top-24">
                <CardHeader>
                  <CardTitle>Tóm tắt đơn hàng</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-start gap-3 p-4 rounded-lg bg-accent/50">
                      <div className="w-12 h-12 rounded-lg bg-gradient-primary flex items-center justify-center shadow-soft shrink-0">
                        <CheckCircle2 className="w-6 h-6 text-primary-foreground" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg">Gói {planName} {currentPlan.label}</h3>
                        <p className="text-sm text-muted-foreground">
                          {currentPlan.note}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Giá gói</span>
                        <span className="font-medium">{currentPlan.price.toLocaleString('vi-VN')}đ</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Thuế VAT (10%)</span>
                        <span className="font-medium">{currentPlan.vat.toLocaleString('vi-VN')}đ</span>
                      </div>
                    </div>

                    <Separator />

                    <div className="flex justify-between text-lg font-bold">
                      <span>Tổng cộng</span>
                      <span className="text-primary">{currentPlan.total.toLocaleString('vi-VN')}đ</span>
                    </div>
                  </div>

                  <div className="space-y-3 text-sm text-muted-foreground">
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                      <span>
                        Tự động gia hạn {selectedCycle === "1month" ? "hàng tháng" : selectedCycle === "6months" ? "mỗi 6 tháng" : "mỗi năm"}
                      </span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                      <span>Hủy bất cứ lúc nào</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                      <span>Hoàn tiền 100% trong 7 ngày</span>
                    </div>
                  </div>

                  <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
                    <p className="text-sm text-foreground">
                      <strong>Gói đã chọn:</strong> {planName} {currentPlan.label} ({currentPlan.displayPrice})
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>

      {/* QR Code Dialog */}
      <Dialog open={showQRDialog} onOpenChange={setShowQRDialog}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <QrCode className="w-5 h-5" />
              Quét mã QR để thanh toán
            </DialogTitle>
            <DialogDescription>
              Quét mã QR bằng ứng dụng ngân hàng để thanh toán tự động
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid md:grid-cols-2 gap-6">
            {/* Left: QR Code */}
            <div className="flex flex-col items-center justify-center">
              <div className="p-4 bg-white rounded-lg">
                {qrCodeUrl && (
                  <img 
                    src={qrCodeUrl} 
                    alt="QR Code Payment" 
                    className="w-64 h-64 object-contain"
                    onError={(e) => {
                      console.error("QR Code load error");
                      toast.error("Không thể tải mã QR. Vui lòng thử lại!");
                    }}
                  />
                )}
              </div>
              <p className="text-sm text-muted-foreground mt-3 text-center">
                Quét mã QR để tự động điền thông tin
              </p>
            </div>

            {/* Right: Bank Information */}
            <div className="space-y-4">
              <h4 className="font-semibold">Thông tin chuyển khoản:</h4>
              
              <div className="space-y-2 text-sm">
                <div className="flex justify-between items-center p-3 bg-accent rounded-lg">
                  <div className="flex-1">
                    <div className="text-muted-foreground text-xs">Ngân hàng</div>
                    <div className="font-medium">Techcombank</div>
                  </div>
                </div>

                <div className="flex justify-between items-center p-3 bg-accent rounded-lg">
                  <div className="flex-1">
                    <div className="text-muted-foreground text-xs">Số tài khoản</div>
                    <div className="font-medium">{bankInfo.accountNo}</div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleCopyAccountInfo(bankInfo.accountNo)}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>

                <div className="flex justify-between items-center p-3 bg-accent rounded-lg">
                  <div className="flex-1">
                    <div className="text-muted-foreground text-xs">Chủ tài khoản</div>
                    <div className="font-medium">{bankInfo.accountName}</div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleCopyAccountInfo(bankInfo.accountName)}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>

                <div className="flex justify-between items-center p-3 bg-accent rounded-lg">
                  <div className="flex-1">
                    <div className="text-muted-foreground text-xs">Số tiền</div>
                    <div className="font-bold text-primary text-lg">{bankInfo.amount.toLocaleString('vi-VN')}đ</div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleCopyAccountInfo(bankInfo.amount.toString())}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>

                <div className="flex justify-between items-start p-3 bg-accent rounded-lg">
                  <div className="flex-1 min-w-0">
                    <div className="text-muted-foreground text-xs mb-1">Nội dung chuyển khoản</div>
                    <div className="font-medium break-words">
                      {customerInfo.fullName} {customerInfo.email} {planName}-{currentPlan.label}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="ml-2 flex-shrink-0"
                    onClick={() => handleCopyAccountInfo(`${customerInfo.fullName} ${customerInfo.email} ${planName}-${currentPlan.label}`)}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
                <p className="text-xs text-amber-800 dark:text-amber-200">
                  <strong>Lưu ý:</strong> Vui lòng chuyển khoản đúng nội dung để hệ thống tự động xác nhận. Tài khoản sẽ được kích hoạt sau khi được xác minh.
                </p>
              </div>

              <Button 
                className="w-full" 
                onClick={() => {
                  setShowQRDialog(false);
                  toast.info("Tài khoản sẽ được kích hoạt sau khi xác minh thành công", {
                    description: "Vui lòng kiểm tra email để nhận thông báo khi tài khoản được kích hoạt.",
                    duration: 5000
                  });
                }}
              >
                Đã chuyển khoản
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Checkout;
