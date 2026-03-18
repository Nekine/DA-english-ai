import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Building2, CheckCircle2, ArrowLeft, QrCode, Copy } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/components/AuthContext";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const Checkout = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);
  const [showQRDialog, setShowQRDialog] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const [selectedPlan, setSelectedPlan] = useState<'1month' | '6months'>('1month');
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

  // Pricing plans
  const plans = {
    '1month': { price: 199000, vat: 19900, total: 218900, label: '1 tháng' },
    '6months': { price: 999000, vat: 99900, total: 1098900, label: '6 tháng' }
  };

  const currentPlan = plans[selectedPlan];

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
    const transferContent = `${fullName} ${email}`;
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
                    Hoàn tất thanh toán để kích hoạt tài khoản Premium
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
                          onClick={() => setSelectedPlan('1month')}
                          className={`p-4 rounded-lg border-2 transition-all ${
                            selectedPlan === '1month'
                              ? 'border-primary bg-primary/10'
                              : 'border-border hover:border-primary/50'
                          }`}
                        >
                          <div className="text-lg font-bold">1 Tháng</div>
                          <div className="text-2xl font-bold text-primary mt-2">199.000đ</div>
                          <div className="text-sm text-muted-foreground mt-1">199.000đ/tháng</div>
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedPlan('6months')}
                          className={`p-4 rounded-lg border-2 transition-all relative ${
                            selectedPlan === '6months'
                              ? 'border-primary bg-primary/10'
                              : 'border-border hover:border-primary/50'
                          }`}
                        >
                          <div className="absolute -top-2 -right-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full font-semibold">
                            Giảm 16%
                          </div>
                          <div className="text-lg font-bold">6 Tháng</div>
                          <div className="text-2xl font-bold text-primary mt-2">999.000đ</div>
                          <div className="text-sm text-muted-foreground mt-1">166.500đ/tháng</div>
                        </button>
                      </div>
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
                        <h3 className="font-semibold text-lg">Gói Premium {currentPlan.label}</h3>
                        <p className="text-sm text-muted-foreground">
                          {selectedPlan === '6months' ? 'Tiết kiệm 16%' : 'Thanh toán hàng tháng'}
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
                      <span>Tự động gia hạn hàng tháng</span>
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
                      <strong>Ưu đãi đặc biệt:</strong> Tặng thêm 1 tháng khi đăng ký năm đầu tiên!
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
                      {customerInfo.fullName} {customerInfo.email}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="ml-2 flex-shrink-0"
                    onClick={() => handleCopyAccountInfo(`${customerInfo.fullName} ${customerInfo.email}`)}
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
