import React, { useState } from 'react';
import { Download, FileSpreadsheet, FileText, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import exportService from '@/services/exportService';
import { Transaction, TransactionFilters, SortConfig } from '@/services/transactionService';

interface ExportButtonProps {
  transactions: Transaction[];
  filters?: TransactionFilters;
  sortConfig?: SortConfig;
  disabled?: boolean;
}

const ExportButton: React.FC<ExportButtonProps> = ({
  transactions,
  filters,
  sortConfig,
  disabled = false,
}) => {
  const [exporting, setExporting] = useState(false);
  const { toast } = useToast();

  const handleExport = async (format: 'excel' | 'csv' | 'pdf') => {
    console.log('=== Export Button Debug ===');
    console.log('Transactions:', transactions.length);
    console.log('First transaction:', transactions[0]);
    console.log('Filters:', filters);
    console.log('Sort config:', sortConfig);
    
    if (transactions.length === 0) {
      toast({
        title: 'Không có dữ liệu',
        description: 'Không có giao dịch nào để xuất',
        variant: 'destructive',
      });
      return;
    }

    setExporting(true);

    try {
      switch (format) {
        case 'excel':
          exportService.exportToExcel(transactions, filters, sortConfig);
          toast({
            title: 'Xuất Excel thành công',
            description: `Đã xuất ${transactions.length} giao dịch`,
          });
          break;

        case 'csv':
          exportService.exportToCSV(transactions, filters, sortConfig);
          toast({
            title: 'Xuất CSV thành công',
            description: `Đã xuất ${transactions.length} giao dịch`,
          });
          break;

        case 'pdf':
          exportService.exportToPDF(transactions, filters, sortConfig);
          toast({
            title: 'Xuất PDF thành công',
            description: `Đã xuất ${transactions.length} giao dịch`,
          });
          break;
      }
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: 'Lỗi xuất file',
        description: error instanceof Error ? error.message : 'Không thể xuất file',
        variant: 'destructive',
      });
    } finally {
      setExporting(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={disabled || exporting || transactions.length === 0}
        >
          {exporting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Đang xuất...
            </>
          ) : (
            <>
              <Download className="w-4 h-4 mr-2" />
              Xuất file
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel>Chọn định dạng</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => handleExport('excel')}
          disabled={exporting}
          className="cursor-pointer"
        >
          <FileSpreadsheet className="w-4 h-4 mr-2 text-green-600" />
          <div>
            <div className="font-medium">Excel</div>
            <div className="text-xs text-muted-foreground">Định dạng .xlsx</div>
          </div>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => handleExport('csv')}
          disabled={exporting}
          className="cursor-pointer"
        >
          <FileText className="w-4 h-4 mr-2 text-blue-600" />
          <div>
            <div className="font-medium">CSV</div>
            <div className="text-xs text-muted-foreground">Định dạng .csv</div>
          </div>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => handleExport('pdf')}
          disabled={exporting}
          className="cursor-pointer"
        >
          <FileText className="w-4 h-4 mr-2 text-red-600" />
          <div>
            <div className="font-medium">PDF</div>
            <div className="text-xs text-muted-foreground">Định dạng .pdf</div>
          </div>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default ExportButton;
