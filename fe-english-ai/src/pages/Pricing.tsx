import { Check, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import Header from '@/components/Navbar';
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useState } from "react";

type BillingCycle = "1month" | "6months" | "1year";
type PlanTier = "pre" | "max";

type Plan = {
  name: string;
  price: string;
  description: string;
  features: string[];
  limitations: string[];
  buttonText: string;
  isPremium: boolean;
  period?: string;
  originalPrice?: string;
  discount?: string;
  popular?: boolean;
  tier?: PlanTier;
};

const Pricing = () => {
  const navigate = useNavigate();
  const [selectedCycle, setSelectedCycle] = useState<BillingCycle>("1month");

  const cycleOptions: Array<{ value: BillingCycle; label: string }> = [
    { value: "1month", label: "1 tháng" },
    { value: "6months", label: "6 tháng" },
    { value: "1year", label: "1 năm" },
  ];

  const freePlan: Plan = {
    name: "Miễn phí",
    price: "0đ",
    description: "Dùng thử các tính năng cơ bản",
    features: [
      "5 bài tập/ngày",
      "4 đề thi mỗi tháng",
      "Nhận xét cơ bản",
      "Đánh giá điểm yếu",
      "Lộ trình học cơ bản",
      "Báo cáo tiến độ học tập",
      "Từ vựng giới hạn",
    ],
    limitations: ["Giới hạn số bài", "Không có báo cáo chi tiết"],
    buttonText: "Gói hiện tại",
    isPremium: false,
  };

  const commonPremiumFeatures = [
    "Nhận xét chi tiết và chuyên sâu",
    "Từ vựng không giới hạn",
    "Lưu lịch sử bài tập",
    "Đánh giá điểm yếu",
    "Lộ trình học chi tiết",
    "Báo cáo tiến độ học tập",
    "Hỗ trợ ưu tiên",
  ];

  const planByCycle: Record<BillingCycle, Plan[]> = {
    "1month": [
      {
        name: "Pre 1 tháng",
        price: "10.000đ",
        period: "/tháng",
        description: "Gói nâng cấp tiêu chuẩn",
        features: ["15 bài tập/ngày", "10 đề thi mỗi tháng", ...commonPremiumFeatures],
        limitations: [],
        buttonText: "Nâng cấp ngay",
        isPremium: true,
        tier: "pre",
      },
      {
        name: "Max 1 tháng",
        price: "299.000đ",
        period: "/tháng",
        description: "Chỉ khác Pre ở mức không giới hạn bài tập và đề thi",
        features: [
          "Không giới hạn bài tập",
          "Không giới hạn đề thi",
          ...commonPremiumFeatures,
        ],
        limitations: [],
        buttonText: "Nâng cấp ngay",
        isPremium: true,
        tier: "max",
        popular: true,
      },
    ],
    "6months": [
      {
        name: "Pre 6 tháng",
        price: "999.000đ",
        period: "/6 tháng",
        originalPrice: "1.194.000đ",
        discount: "16%",
        description: "Tiết kiệm hơn với gói dài hạn",
        features: ["15 bài tập/ngày", "10 đề thi mỗi tháng", ...commonPremiumFeatures],
        limitations: [],
        buttonText: "Nâng cấp ngay",
        isPremium: true,
        tier: "pre",
      },
      {
        name: "Max 6 tháng",
        price: "1.499.000đ",
        period: "/6 tháng",
        originalPrice: "1.794.000đ",
        discount: "16%",
        description: "Chỉ khác Pre ở mức không giới hạn bài tập và đề thi",
        features: [
          "Không giới hạn bài tập",
          "Không giới hạn đề thi",
          ...commonPremiumFeatures,
        ],
        limitations: [],
        buttonText: "Nâng cấp ngay",
        isPremium: true,
        tier: "max",
        popular: true,
      },
    ],
    "1year": [
      {
        name: "Pre 1 năm",
        price: "1.899.000đ",
        period: "/năm",
        originalPrice: "2.388.000đ",
        discount: "20%",
        description: "Gói Pre tiết kiệm tối đa theo năm",
        features: ["15 bài tập/ngày", "10 đề thi mỗi tháng", ...commonPremiumFeatures],
        limitations: [],
        buttonText: "Nâng cấp ngay",
        isPremium: true,
        tier: "pre",
      },
      {
        name: "Max 1 năm",
        price: "2.799.000đ",
        period: "/năm",
        originalPrice: "3.588.000đ",
        discount: "22%",
        description: "Chỉ khác Pre ở mức không giới hạn bài tập và đề thi",
        features: [
          "Không giới hạn bài tập",
          "Không giới hạn đề thi",
          ...commonPremiumFeatures,
        ],
        limitations: [],
        buttonText: "Nâng cấp ngay",
        isPremium: true,
        tier: "max",
        popular: true,
      },
    ],
  };

  const plans = [freePlan, ...planByCycle[selectedCycle]];

  const handleSelectPlan = (plan: Plan) => {
    if (plan.name === "Miễn phí") {
      toast.info("Bạn đang sử dụng gói miễn phí");
    } else {
      const tier = plan.tier ?? "pre";
      navigate(`/checkout?tier=${tier}&cycle=${selectedCycle}`);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-soft">
      <Header />
      <main className="container mx-auto px-4 py-12">
        <div className="max-w-6xl mx-auto">
          <Button
            variant="ghost"
            onClick={() => navigate("/")}
            className="mb-6"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Quay về
          </Button>
        </div>
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            Nâng cấp gói học
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Chọn chu kỳ thanh toán để xem gói Pre và Max tương ứng
          </p>

          <div className="mt-6 inline-flex items-center gap-2 rounded-xl border border-border bg-card p-2">
            {cycleOptions.map((cycle) => (
              <Button
                key={cycle.value}
                type="button"
                size="sm"
                variant={selectedCycle === cycle.value ? "default" : "ghost"}
                onClick={() => setSelectedCycle(cycle.value)}
                className="min-w-[90px]"
              >
                {cycle.label}
              </Button>
            ))}
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan) => (
            <Card
              key={plan.name}
              className={`relative ${
                plan.popular
                  ? "border-primary shadow-hover scale-105 md:scale-110"
                  : "border-border"
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <span className="bg-gradient-primary text-primary-foreground px-4 py-1 rounded-full text-sm font-semibold shadow-soft">
                    Phổ biến nhất
                  </span>
                </div>
              )}
              <CardHeader className="text-center pb-4">
                <CardTitle className="text-2xl mb-2">{plan.name}</CardTitle>
                <CardDescription className="text-base">
                  {plan.description}
                </CardDescription>
                <div className="mt-4">
                  {plan.originalPrice && (
                    <div className="mb-1">
                      <span className="text-lg text-muted-foreground line-through">
                        {plan.originalPrice}
                      </span>
                      {plan.discount && (
                        <span className="ml-2 text-sm bg-green-100 text-green-700 px-2 py-1 rounded-full font-semibold">
                          Giảm {plan.discount}
                        </span>
                      )}
                    </div>
                  )}
                  <span className="text-4xl font-bold text-primary">
                    {plan.price}
                  </span>
                  {plan.period && (
                    <span className="text-muted-foreground">{plan.period}</span>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  {plan.features.map((feature, index) => (
                    <div key={index} className="flex items-start gap-2">
                      <Check className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                      <span className="text-sm text-foreground">{feature}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
              <CardFooter>
                <Button
                  className="w-full"
                  variant={plan.isPremium ? "default" : "outline"}
                  size="lg"
                  onClick={() => handleSelectPlan(plan)}
                >
                  {plan.buttonText}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>

        <div className="mt-16 text-center">
          <h2 className="text-2xl font-bold text-foreground mb-6">
            Câu hỏi thường gặp
          </h2>
          <div className="max-w-3xl mx-auto space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg text-left">
                  Tôi có thể hủy gói Premium bất cứ lúc nào không?
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-left">
                  Có, bạn có thể hủy gói Premium bất cứ lúc nào. Tài khoản của bạn sẽ tiếp tục có quyền truy cập Premium cho đến hết chu kỳ thanh toán hiện tại.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg text-left">
                  Phương thức thanh toán nào được chấp nhận?
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-left">
                  Chúng tôi chấp nhận thanh toán qua thẻ ATM nội địa, ví điện tử (MoMo, ZaloPay), và chuyển khoản ngân hàng.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg text-left">
                  Có chính sách hoàn tiền không?
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-left">
                  Có, chúng tôi có chính sách hoàn tiền 100% trong vòng 7 ngày đầu tiên nếu bạn không hài lòng với dịch vụ.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Pricing;
