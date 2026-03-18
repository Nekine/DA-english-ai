import * as XLSX from 'xlsx';
import { Transaction, TransactionFilters, SortConfig } from './transactionService';

class ExportService {
  /**
   * Format date for export
   */
  private formatDate(dateString: string): string {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  }

  /**
   * Format currency for export
   */
  private formatCurrency(amount: number): string {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount);
  }

  /**
   * Get status label in Vietnamese
   */
  private getStatusLabel(status: string): string {
    const statusMap: Record<string, string> = {
      completed: 'Đã hoàn thành',
      pending: 'Chờ xử lý',
      failed: 'Thất bại',
    };
    return statusMap[status] || status;
  }

  /**
   * Generate filename with timestamp
   */
  private generateFilename(type: string, filters?: TransactionFilters): string {
    const timestamp = new Date().toISOString().split('T')[0];
    let filename = `giao-dich-${timestamp}`;

    if (filters?.status && filters.status !== 'all') {
      filename += `-${filters.status}`;
    }

    if (filters?.startDate || filters?.endDate) {
      filename += '-filtered';
    }

    return `${filename}.${type}`;
  }

  /**
   * Get filter metadata text
   */
  private getFilterMetadata(filters?: TransactionFilters, sortConfig?: SortConfig): string {
    const metadata: string[] = [];

    if (filters?.searchTerm) {
      metadata.push(`Tìm kiếm: ${filters.searchTerm}`);
    }

    if (filters?.status && filters.status !== 'all') {
      metadata.push(`Trạng thái: ${this.getStatusLabel(filters.status)}`);
    }

    if (filters?.startDate) {
      metadata.push(`Từ ngày: ${this.formatDate(filters.startDate.toISOString())}`);
    }

    if (filters?.endDate) {
      metadata.push(`Đến ngày: ${this.formatDate(filters.endDate.toISOString())}`);
    }

    if (sortConfig) {
      const sortLabel = sortConfig.direction === 'asc' ? 'Tăng dần' : 'Giảm dần';
      metadata.push(`Sắp xếp: ${sortConfig.column} (${sortLabel})`);
    }

    return metadata.length > 0 ? metadata.join(' | ') : 'Không có bộ lọc';
  }

  /**
   * Export transactions to Excel format
   */
  exportToExcel(
    transactions: Transaction[],
    filters?: TransactionFilters,
    sortConfig?: SortConfig
  ): void {
    try {
      console.log('=== Excel Export Debug ===');
      console.log('Transactions count:', transactions.length);
      console.log('First transaction:', transactions[0]);
      
      // Create workbook
      const wb = XLSX.utils.book_new();

      // Add metadata sheet
      const metadataSheet = XLSX.utils.aoa_to_sheet([
        ['Báo cáo Giao dịch'],
        ['Ngày xuất:', new Date().toLocaleString('vi-VN')],
        ['Tổng số giao dịch:', transactions.length],
        ['Bộ lọc:', this.getFilterMetadata(filters, sortConfig)],
        [],
      ]);
      XLSX.utils.book_append_sheet(wb, metadataSheet, 'Thông tin');

      // Add transactions sheet with explicit headers
      const headers = [
        'ID Giao dịch',
        'Tên người dùng',
        'Email',
        'Số tiền',
        'Số tiền (VNĐ)',
        'Trạng thái',
        'Ngày tạo',
      ];

      const rows = transactions.map((transaction) => [
        transaction.Id,
        transaction.UserName || 'N/A',
        transaction.UserEmail,
        transaction.Amount,
        this.formatCurrency(transaction.Amount),
        this.getStatusLabel(transaction.Status),
        this.formatDate(transaction.CreatedAt),
      ]);

      console.log('Headers:', headers);
      console.log('Rows count:', rows.length);
      console.log('First row:', rows[0]);
      
      // Create worksheet from array of arrays
      const ws = XLSX.utils.aoa_to_sheet([headers]);
      
      // Add data rows
      XLSX.utils.sheet_add_aoa(ws, rows, { origin: 'A2' });
      
      console.log('Worksheet created with range:', ws['!ref']);

      // Set column widths
      const colWidths = [
        { wch: 12 }, // ID
        { wch: 25 }, // Name
        { wch: 30 }, // Email
        { wch: 15 }, // Amount (number)
        { wch: 20 }, // Amount (formatted)
        { wch: 18 }, // Status
        { wch: 20 }, // Date
      ];
      ws['!cols'] = colWidths;

      XLSX.utils.book_append_sheet(wb, ws, 'Giao dịch');
      
      console.log('Workbook sheets:', wb.SheetNames);
      console.log('Workbook:', wb);

      // Generate Excel file and download
      const filename = this.generateFilename('xlsx', filters);
      XLSX.writeFile(wb, filename);

      console.log(`Excel file exported: ${filename}`);
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      throw new Error('Không thể xuất file Excel');
    }
  }

  /**
   * Export transactions to CSV format
   */
  exportToCSV(
    transactions: Transaction[],
    filters?: TransactionFilters,
    sortConfig?: SortConfig
  ): void {
    try {
      // Prepare CSV header
      const headers = [
        'ID Giao dịch',
        'Tên người dùng',
        'Email',
        'Số tiền (VNĐ)',
        'Trạng thái',
        'Ngày tạo',
      ];

      // Prepare CSV rows
      const rows = transactions.map((transaction) => [
        transaction.Id,
        transaction.UserName || 'N/A',
        transaction.UserEmail,
        transaction.Amount,
        this.getStatusLabel(transaction.Status),
        this.formatDate(transaction.CreatedAt),
      ]);

      // Add metadata as comments
      const metadata = [
        `# Báo cáo Giao dịch`,
        `# Ngày xuất: ${new Date().toLocaleString('vi-VN')}`,
        `# Tổng số giao dịch: ${transactions.length}`,
        `# Bộ lọc: ${this.getFilterMetadata(filters, sortConfig)}`,
        '',
      ];

      // Combine metadata, headers, and rows
      const csvContent = [
        ...metadata,
        headers.join(','),
        ...rows.map((row) =>
          row
            .map((cell) => {
              // Escape special characters
              const cellStr = String(cell);
              if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
                return `"${cellStr.replace(/"/g, '""')}"`;
              }
              return cellStr;
            })
            .join(',')
        ),
      ].join('\n');

      // Create blob and download
      const blob = new Blob(['\uFEFF' + csvContent], {
        type: 'text/csv;charset=utf-8;',
      });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);

      link.setAttribute('href', url);
      link.setAttribute('download', this.generateFilename('csv', filters));
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      console.log(`CSV file exported`);
    } catch (error) {
      console.error('Error exporting to CSV:', error);
      throw new Error('Không thể xuất file CSV');
    }
  }

  /**
   * Export transactions to PDF format
   * Note: This is a simplified version. For production, consider using jsPDF with better formatting
   */
  exportToPDF(
    transactions: Transaction[],
    filters?: TransactionFilters,
    sortConfig?: SortConfig
  ): void {
    try {
      // Create HTML content for PDF
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>Báo cáo Giao dịch</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              padding: 20px;
              color: #333;
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
              border-bottom: 2px solid #4CAF50;
              padding-bottom: 20px;
            }
            .header h1 {
              color: #4CAF50;
              margin: 0;
            }
            .metadata {
              background: #f5f5f5;
              padding: 15px;
              border-radius: 5px;
              margin-bottom: 20px;
            }
            .metadata p {
              margin: 5px 0;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 20px;
            }
            th {
              background: #4CAF50;
              color: white;
              padding: 12px;
              text-align: left;
              font-weight: bold;
            }
            td {
              padding: 10px;
              border-bottom: 1px solid #ddd;
            }
            tr:hover {
              background: #f5f5f5;
            }
            .status-completed {
              color: #4CAF50;
              font-weight: bold;
            }
            .status-pending {
              color: #FF9800;
              font-weight: bold;
            }
            .status-failed {
              color: #F44336;
              font-weight: bold;
            }
            .footer {
              margin-top: 30px;
              text-align: center;
              color: #666;
              font-size: 12px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>BÁO CÁO GIAO DỊCH</h1>
            <p>Hệ thống EngAce</p>
          </div>
          
          <div class="metadata">
            <p><strong>Ngày xuất:</strong> ${new Date().toLocaleString('vi-VN')}</p>
            <p><strong>Tổng số giao dịch:</strong> ${transactions.length}</p>
            <p><strong>Bộ lọc:</strong> ${this.getFilterMetadata(filters, sortConfig)}</p>
          </div>

          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Người dùng</th>
                <th>Email</th>
                <th>Số tiền</th>
                <th>Trạng thái</th>
                <th>Ngày tạo</th>
              </tr>
            </thead>
            <tbody>
              ${transactions
                .map(
                  (t) => `
                <tr>
                  <td>${t.Id}</td>
                  <td>${t.UserName || 'N/A'}</td>
                  <td>${t.UserEmail}</td>
                  <td>${this.formatCurrency(t.Amount)}</td>
                  <td class="status-${t.Status}">${this.getStatusLabel(t.Status)}</td>
                  <td>${this.formatDate(t.CreatedAt)}</td>
                </tr>
              `
                )
                .join('')}
            </tbody>
          </table>

          <div class="footer">
            <p>Báo cáo được tạo tự động bởi hệ thống EngAce</p>
          </div>
        </body>
        </html>
      `;

      // Create blob and open in new window for printing
      const blob = new Blob([htmlContent], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const printWindow = window.open(url, '_blank');

      if (printWindow) {
        printWindow.onload = () => {
          setTimeout(() => {
            printWindow.print();
          }, 250);
        };
      }

      console.log('PDF export initiated');
    } catch (error) {
      console.error('Error exporting to PDF:', error);
      throw new Error('Không thể xuất file PDF');
    }
  }
}

// Export singleton instance
const exportService = new ExportService();
export default exportService;
