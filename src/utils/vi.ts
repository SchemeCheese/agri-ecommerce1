export const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(amount);
};

export const formatOrderStatus = (status: string): string => {
  const statusLabels: Record<string, string> = {
    PENDING: 'Chờ xác nhận',
    CONFIRMED: 'Đã xác nhận',
    SHIPPING: 'Đang giao hàng',
    COMPLETED: 'Đã hoàn thành',
    CANCELLED: 'Đã hủy',
    ISSUE_REPORTED: 'Báo sự cố',
    RETURNED: 'Đã trả lại',
    REFUND_PENDING: 'Chờ hoàn tiền',
    FAILED: 'Thất bại',
    REFUNDED: 'Đã hoàn tiền',
  };
  return statusLabels[status] || status;
};