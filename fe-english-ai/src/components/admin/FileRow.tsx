import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download, FileText, RefreshCw, Trash2 } from "lucide-react";

interface FileRowProps {
  fileName: string;
  fileSize: string;
  uploadDate: string;
  status?: 'uploaded' | 'processing' | 'error' | 'local';
  onDelete?: () => void;
  onDownload?: () => void;
  onRetry?: () => void;
}

export const FileRow = ({ 
  fileName, 
  fileSize, 
  uploadDate, 
  status = 'uploaded',
  onDelete,
  onDownload,
  onRetry 
}: FileRowProps) => {
  const getStatusBadge = () => {
    switch (status) {
      case 'uploaded':
        return <Badge variant="default" className="bg-green-500 dark:bg-green-600 text-white">Đã tải lên</Badge>;
      case 'processing':
        return <Badge variant="secondary" className="bg-yellow-500 dark:bg-yellow-600 text-white">Đang xử lý</Badge>;
      case 'error':
        return <Badge variant="destructive" className="bg-red-500 dark:bg-red-600 text-white">Lỗi</Badge>;
      case 'local':
        return <Badge variant="outline" className="bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800">Cục bộ</Badge>;
      default:
        return null;
    }
  };
  
  return (
    <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors border border-gray-200 dark:border-gray-600">
      <div className="flex items-center space-x-3">
        <FileText className="h-4 w-4 text-gray-500 dark:text-gray-400" />
        <div>
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{fileName}</p>
          <div className="flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400">
            <span>{fileSize}</span>
            <span>•</span>
            <span>{uploadDate}</span>
          </div>
        </div>
        {getStatusBadge()}
      </div>
    
      <div className="flex space-x-1">
        {onRetry && (
          <Button variant="outline" size="sm" onClick={onRetry} className="border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600">
            <RefreshCw className="h-3 w-3" />
          </Button>
        )}
        {onDownload && (
          <Button variant="outline" size="sm" onClick={onDownload} className="border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600">
            <Download className="h-3 w-3" />
          </Button>
        )}
        {onDelete && (
          <Button 
            variant="outline" 
            size="sm" 
            className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 border-gray-300 dark:border-gray-600 hover:bg-red-50 dark:hover:bg-red-900/20"
            onClick={onDelete}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        )}
      </div>
    </div>
  );
};