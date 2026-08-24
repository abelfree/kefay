export type InvoiceStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';

export type Role = 'STAFF' | 'APPROVER';

export interface AuthUser {
  id: string;
  email: string;
  role: Role;
  orgId: string;
}

export interface LineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: string;
  invoiceId: string;
}

export interface Invoice {
  id: string;
  number: string;
  customer: string;
  status: InvoiceStatus;
  subtotal: string;
  tax: string;
  total: string;
  orgId: string;
  createdAt: string;
  lineItems: LineItem[];
}

export interface PaginatedInvoices {
  items: Invoice[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
