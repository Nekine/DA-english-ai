import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Clock, UserX, CheckCircle, RefreshCw, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription } from "@/components/ui/alert";
import paymentService, { ExpiredCheckResult, ExpiringSoonUser } from '@/services/paymentService';

export const PremiumExpirationPanel = () => {
  const [checking, setChecking] = useState(false);
  const [loadingExpiringSoon, setLoadingExpiringSoon] = useState(false);
  const [checkResult, setCheckResult] = useState<ExpiredCheckResult | null>(null);
  const [expiringSoonUsers, setExpiringSoonUsers] = useState<ExpiringSoonUser[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [daysFilter, setDaysFilter] = useState(7);

  const handleCheckExpired = async () => {
    try {
      setChecking(true);
      setError(null);
      const result = await paymentService.checkExpiredPremium();
      setCheckResult(result);
      
      // Auto refresh expiring soon list after check
      if (result.success) {
        await loadExpiringSoonUsers();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể kiểm tra tài khoản hết hạn');
      setCheckResult(null);
    } finally {
      setChecking(false);
    }
  };

  const loadExpiringSoonUsers = async () => {
    try {
      setLoadingExpiringSoon(true);
      setError(null);
      const data = await paymentService.getExpiringSoonUsers(daysFilter);
      setExpiringSoonUsers(data.users || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể tải danh sách tài khoản sắp hết hạn');
    } finally {
      setLoadingExpiringSoon(false);
    }
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getDaysRemainingBadge = (daysRemaining: number) => {
    if (daysRemaining <= 1) {
      return <Badge variant="destructive" className="flex items-center gap-1">
        <AlertCircle className="w-3 h-3" />
        {daysRemaining} ngày
      </Badge>;
    } else if (daysRemaining <= 3) {
      return <Badge variant="outline" className="flex items-center gap-1 border-orange-500 text-orange-600">
        <AlertTriangle className="w-3 h-3" />
        {daysRemaining} ngày
      </Badge>;
    } else {
      return <Badge variant="secondary" className="flex items-center gap-1">
        <Clock className="w-3 h-3" />
        {daysRemaining} ngày
      </Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Manual Check Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserX className="w-5 h-5" />
            Kiểm tra tài khoản Premium hết hạn
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <Button 
              onClick={handleCheckExpired} 
              disabled={checking}
              className="flex items-center gap-2"
            >
              {checking ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Đang kiểm tra...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  Kiểm tra và hạ cấp tài khoản hết hạn
                </>
              )}
            </Button>
            
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {checkResult && (
            <Alert variant={checkResult.totalDowngraded > 0 ? "default" : "default"} 
                   className={checkResult.totalDowngraded > 0 ? "border-orange-500" : "border-green-500"}>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-2">
                  <p className="font-medium">
                    Đã kiểm tra {checkResult.totalChecked} tài khoản
                  </p>
                  <p>
                    Hạ cấp: <span className="font-bold">{checkResult.totalDowngraded}</span> tài khoản
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Thời gian: {formatDate(checkResult.checkedAt)}
                  </p>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {checkResult && checkResult.expiredUsers && checkResult.expiredUsers.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Tài khoản vừa bị hạ cấp:</h4>
              <div className="border rounded-lg divide-y max-h-64 overflow-y-auto">
                {checkResult.expiredUsers.map((user, index) => (
                  <div key={index} className="p-3 hover:bg-muted/50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{user.email}</p>
                        <p className="text-sm text-muted-foreground">{user.fullName}</p>
                      </div>
                      <Badge variant="destructive">Đã hạ cấp</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Hết hạn: {formatDate(user.expiredAt)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Expiring Soon Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-500" />
            Tài khoản sắp hết hạn
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">Trong vòng:</label>
              <select 
                value={daysFilter}
                onChange={(e) => setDaysFilter(Number(e.target.value))}
                className="border border-gray-300 dark:border-gray-600 rounded px-3 py-1 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value={3}>3 ngày</option>
                <option value={7}>7 ngày</option>
                <option value={14}>14 ngày</option>
                <option value={30}>30 ngày</option>
                <option value={60}>60 ngày</option>
              </select>
            </div>
            <Button 
              onClick={loadExpiringSoonUsers} 
              disabled={loadingExpiringSoon}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              {loadingExpiringSoon ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Đang tải...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4" />
                  Tải danh sách
                </>
              )}
            </Button>
          </div>

          {expiringSoonUsers.length > 0 ? (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Có <span className="font-bold">{expiringSoonUsers.length}</span> tài khoản sắp hết hạn
              </p>
              <div className="border rounded-lg divide-y max-h-96 overflow-y-auto">
                {expiringSoonUsers.map((user, index) => (
                  <div key={index} className="p-3 hover:bg-muted/50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="font-medium">{user.email}</p>
                        <p className="text-sm text-muted-foreground">{user.fullName}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Hết hạn: {formatDate(user.premiumExpiresAt)}
                        </p>
                      </div>
                      {getDaysRemainingBadge(user.daysRemaining)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <Alert>
              <AlertDescription>
                {loadingExpiringSoon 
                  ? 'Đang tải...' 
                  : 'Không có tài khoản nào sắp hết hạn trong thời gian này'}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
