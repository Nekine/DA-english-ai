import React from 'react';
import { Search, X, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { TransactionFilters as ITransactionFilters, PaymentStatus } from '@/services/transactionService';

interface TransactionFiltersProps {
  filters: ITransactionFilters;
  onFilterChange: (filters: ITransactionFilters) => void;
  onClearFilters: () => void;
}

const TransactionFilters: React.FC<TransactionFiltersProps> = ({
  filters,
  onFilterChange,
  onClearFilters,
}) => {
  const handleSearchChange = (value: string) => {
    onFilterChange({ ...filters, searchTerm: value });
  };

  const handleStatusChange = (value: string) => {
    onFilterChange({
      ...filters,
      status: value as PaymentStatus | 'all',
    });
  };

  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const date = e.target.value ? new Date(e.target.value) : null;
    onFilterChange({ ...filters, startDate: date });
  };

  const handleEndDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const date = e.target.value ? new Date(e.target.value) : null;
    onFilterChange({ ...filters, endDate: date });
  };

  const hasActiveFilters =
    filters.searchTerm ||
    (filters.status && filters.status !== 'all') ||
    filters.startDate ||
    filters.endDate;

  return (
    <div className="space-y-4 p-4 bg-card rounded-lg border border-border">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Bộ lọc</h3>
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearFilters}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4 mr-1" />
            Xóa bộ lọc
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Search Input */}
        <div className="space-y-2">
          <Label htmlFor="search">Tìm kiếm</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              id="search"
              type="text"
              placeholder="Tên, email, hoặc ID..."
              value={filters.searchTerm || ''}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {/* Status Filter */}
        <div className="space-y-2">
          <Label htmlFor="status">Trạng thái</Label>
          <Select
            value={filters.status || 'all'}
            onValueChange={handleStatusChange}
          >
            <SelectTrigger id="status">
              <SelectValue placeholder="Tất cả trạng thái" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả trạng thái</SelectItem>
              <SelectItem value={PaymentStatus.Completed}>
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-500"></span>
                  Đã hoàn thành
                </span>
              </SelectItem>
              <SelectItem value={PaymentStatus.Pending}>
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
                  Chờ xử lý
                </span>
              </SelectItem>
              <SelectItem value={PaymentStatus.Failed}>
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-red-500"></span>
                  Thất bại
                </span>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Start Date Filter */}
        <div className="space-y-2">
          <Label htmlFor="startDate">Từ ngày</Label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <Input
              id="startDate"
              type="date"
              value={
                filters.startDate
                  ? filters.startDate.toISOString().split('T')[0]
                  : ''
              }
              onChange={handleStartDateChange}
              className="pl-9"
            />
          </div>
        </div>

        {/* End Date Filter */}
        <div className="space-y-2">
          <Label htmlFor="endDate">Đến ngày</Label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <Input
              id="endDate"
              type="date"
              value={
                filters.endDate
                  ? filters.endDate.toISOString().split('T')[0]
                  : ''
              }
              onChange={handleEndDateChange}
              className="pl-9"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default TransactionFilters;
