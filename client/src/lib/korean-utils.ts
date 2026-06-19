// Korean formatting utilities
export const formatKoreanCurrency = (amount: number | string): string => {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(numAmount)) return '₩0';
  
  return new Intl.NumberFormat('ko-KR', {
    style: 'currency',
    currency: 'KRW',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(numAmount);
};

export const formatKoreanDate = (date: Date | string): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(dateObj);
};

export const formatKoreanDateTime = (date: Date | string): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(dateObj);
};

export const getStatusColor = (status: string): string => {
  switch (status) {
    case '완료':
    case '배송완료':
      return 'status-completed';
    case '대기중':
    case '배송준비':
      return 'status-pending';
    case '발행':
    case '운송중':
      return 'status-issued';
    case '취소':
      return 'status-cancelled';
    default:
      return 'status-pending';
  }
};

export const generateInvoiceNumber = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const timestamp = now.getTime().toString().slice(-6);
  
  return `INV-${year}${month}-${timestamp}`;
};

export const generateTrackingNumber = (): string => {
  const now = new Date();
  const year = now.getFullYear().toString().slice(-2);
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  
  return `JC${year}${month}${day}${random}`;
};

export const validateKoreanBusinessNumber = (businessNumber: string): boolean => {
  // Remove hyphens and check format
  const cleaned = businessNumber.replace(/-/g, '');
  if (!/^\d{10}$/.test(cleaned)) return false;
  
  // Validate checksum
  const weights = [1, 3, 7, 1, 3, 7, 1, 3, 5];
  let sum = 0;
  
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleaned[i]) * weights[i];
  }
  
  sum += Math.floor((parseInt(cleaned[8]) * 5) / 10);
  const checkDigit = (10 - (sum % 10)) % 10;
  
  return checkDigit === parseInt(cleaned[9]);
};

export const formatKoreanPhone = (phone: string): string => {
  const cleaned = phone.replace(/\D/g, '');
  
  if (cleaned.length === 10) {
    return cleaned.replace(/(\d{2})(\d{4})(\d{4})/, '$1-$2-$3');
  } else if (cleaned.length === 11) {
    return cleaned.replace(/(\d{3})(\d{4})(\d{4})/, '$1-$2-$3');
  }
  
  return phone;
};
