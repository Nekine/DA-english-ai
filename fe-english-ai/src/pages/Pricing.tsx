import { Check, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import Header from '@/components/Navbar';
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

const Pricing = () => {
  const navigate = useNavigate();
  const plans = [
    {
      name: "Miễn phí",
      price: "0đ",
      description: "Dùng thử các tính năng cơ bản",
      features: [
        "5 bài viết/ngày",
        "Nhận xét cơ bản",
        "Từ vựng giới hạn",
        "Không lưu lịch sử",
      ],
      limitations: [
        "Giới hạn số bài",
        "Không xuất PDF",
        "Không có báo cáo chi tiết",
      ],
      buttonText: "Gói hiện tại",
      isPremium: false,
    },
    {
      name: "Premium 1 tháng",
      price: "199.000đ",
      period: "/tháng",
      description: "Mở khóa toàn bộ tính năng",
      features: [
        "Không giới hạn số bài viết",
        "Nhận xét chi tiết và chuyên sâu",
        "Từ vựng không giới hạn",
        "Lưu lịch sử bài viết",
        "Xuất file PDF",
        "Báo cáo tiến độ học tập",
        "Hỗ trợ ưu tiên",
        "Không quảng cáo",
      ],
      limitations: [],
      buttonText: "Nâng cấp ngay",
      isPremium: true,
      popular: false,
    },
    {
      name: "Premium 6 tháng",
      price: "999.000đ",
      period: "/6 tháng",
      originalPrice: "1.194.000đ",
      discount: "16%",
      description: "Tiết kiệm hơn với gói dài hạn",
      features: [
        "Không giới hạn số bài viết",
        "Nhận xét chi tiết và chuyên sâu",
        "Từ vựng không giới hạn",
        "Lưu lịch sử bài viết",
        "Xuất file PDF",
        "Báo cáo tiến độ học tập",
        "Hỗ trợ ưu tiên",
        "Không quảng cáo",
        "Tiết kiệm 195.000đ",
      ],
      limitations: [],
      buttonText: "Nâng cấp ngay",
      isPremium: true,
      popular: true,
    },
  ];

  const handleSelectPlan = (planName: string) => {
    if (planName === "Miễn phí") {
      toast.info("Bạn đang sử dụng gói miễn phí");
    } else {
      navigate("/checkout");
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
            Nâng cấp Premium
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Mở khóa toàn bộ tính năng để nâng cao kỹ năng viết tiếng Anh của bạn
          </p>
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
                  onClick={() => handleSelectPlan(plan.name)}
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
