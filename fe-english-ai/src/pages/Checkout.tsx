import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Building2, CheckCircle2, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/components/AuthContext";
import paymentService from "@/services/paymentService";

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
  const { user, refreshUser } = useAuth();
  const handledOrderCodeRef = useRef<string | null>(null);

  const initialTier = parseTier(searchParams.get("tier"));
  const initialCycle = parseCycle(searchParams.get("cycle"));

  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedTier, setSelectedTier] = useState<PlanTier>(initialTier);
  const [selectedCycle, setSelectedCycle] = useState<BillingCycle>(initialCycle);
  const [customerInfo, setCustomerInfo] = useState({
    fullName: "",
    email: "",
    phone: "",
  });

  // Auto-fill email from user data
  useEffect(() => {
    if (user?.email || user?.fullName) {
      setCustomerInfo(prev => ({
        ...prev,
        email: user?.email || prev.email,
        fullName: user?.fullName || prev.fullName,
      }));
    }
  }, [user]);

  useEffect(() => {
    const orderCode = searchParams.get("orderCode");
    const fromPayos = searchParams.get("payos") === "1";

    if (!fromPayos || !orderCode || handledOrderCodeRef.current === orderCode) {
      return;
    }

    handledOrderCodeRef.current = orderCode;

    const checkOrderStatus = async () => {
      try {
        const result = await paymentService.getPayosOrderStatus(orderCode);

        setSelectedTier(result.tier);
        setSelectedCycle(result.cycle);
        setSearchParams({ tier: result.tier, cycle: result.cycle });

        if (result.status === "completed") {
          await refreshUser();
          toast.success("Thanh toán thành công", {
            description: `Tài khoản đã được kích hoạt gói ${result.packageName}.`,
          });
          return;
        }

        if (result.status === "pending") {
          toast.info("Đơn hàng đang chờ xử lý", {
            description: "Hệ thống sẽ tự động kích hoạt gói khi nhận xác nhận thanh toán từ PayOS.",
          });
          return;
        }

        if (result.status === "cancelled") {
          toast.warning("Bạn đã hủy thanh toán", {
            description: "Bạn có thể thử lại giao dịch bất cứ lúc nào.",
          });
          return;
        }

        toast.error("Thanh toán chưa thành công", {
          description: "Giao dịch thất bại hoặc đã hết hạn. Vui lòng thử lại.",
        });
      } catch (error) {
        console.error("Failed to check PayOS order status:", error);
      }
    };

    void checkOrderStatus();
  }, [searchParams, setSearchParams, refreshUser]);

  const cycleOptions: Array<{ value: BillingCycle; label: string }> = [
    { value: "1month", label: "1 Tháng" },
    { value: "6months", label: "6 Tháng" },
    { value: "1year", label: "1 Năm" },
  ];

  const planMatrix: Record<PlanTier, Record<BillingCycle, CheckoutPlan>> = {
    pre: {
      "1month": {
        price: 10000,
        vat: 1000,
        total: 11000,
        label: "1 tháng",
        displayPrice: "10.000đ",
        monthlyEquivalent: "10.000đ/tháng",
        note: "Giá test tạm thời",
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

  const handleSubmit = async (e: React.FormEvent) => {
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

    try {
      setIsProcessing(true);
      const response = await paymentService.createPayosPaymentLink({
        tier: selectedTier,
        cycle: selectedCycle,
        fullName,
        email,
        phone,
      });

      toast.info("Đang chuyển đến trang thanh toán PayOS...");
      window.location.assign(response.checkoutUrl);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Không thể tạo liên kết thanh toán";
      toast.error(message);
    } finally {
      setIsProcessing(false);
    }
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
                          <div className="font-semibold">PayOS</div>
                          <div className="text-sm text-muted-foreground">
                            Thanh toán tự động qua ngân hàng hoặc ví liên kết trên cổng PayOS
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
                      {isProcessing ? "Đang xử lý..." : "Thanh toán với PayOS"}
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
                        Thanh toán bảo mật và xác nhận tự động qua PayOS
                      </span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                      <span>Kích hoạt gói ngay sau khi thanh toán thành công</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                      <span>Hỗ trợ xử lý đơn hàng nếu giao dịch bị gián đoạn</span>
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
    </div>
  );
};

export default Checkout;
