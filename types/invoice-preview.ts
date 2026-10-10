export interface InvoiceItem {
  description: string;
  qty: number;
  price: number;
  amount: number;
  currency: string;
}

export interface InvoiceData {
  invoiceNumber: string;
  date: string;
  dueDate: string;
  logo?: string | null;
  from: {
    name: string;
    email: string;
    company: string;
    address: string;
    network: string;
    token: string;
    walletAddress: string;
  };
  billTo: {
    name: string;
    email: string;
    company: string;
    address: string;
  };
  note?: string;
  items: InvoiceItem[];
  subtotal: number;
  total: number;
  amountDue: number;
  currency: string;
  status: string;
}


