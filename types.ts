export type Status = 'New' | 'In Progress' | 'Closed';

export interface CustomerRecord {
    TicketID: string;
    'Ticket Category': string;
    'Ticket Notes': string;
    'First Name': string;
    'Last Name': string;
    'Email Address': string;
    'Phone Number': string;
    'Date of Transaction': string;
    'Receipt Number': string;
    'Purchase Amount': string;
    'Last 4 Digits of Card': string;
    'Product': string;
    'Store Name': string;
    'Receipt File': string;
    Status: Status | string;
    'Office Notes': string;
    'File 1': string;
    'File 2': string;
    'File 3': string;
    'File 4': string;
    Timestamp: string;
    [key: string]: string;
}

export interface FileForUpload {
    key: string;
    filename: string;
    mimeType: string;
    data: string; // base64 encoded string without the data URL prefix
}

export interface FormState {
    ticketId?: string;
    fullName: string;
    email: string;
    phoneNumber: string;
    formType: string; // Maps to 'Ticket Category'
    issueDescription: string; // Maps to 'Ticket Notes'
    purchaseDate: string;
    invoiceNumber: string;
    purchaseAmount: string;
    last4Digits: string;
    product: string;
    storeOfPurchase: string;
    status: string;
    officeNotes: string;
    // For tracking existing file URLs during update.
    // Keys match backend expectations for preservation.
    receipt?: string;
    file1?: string;
    file2?: string;
    file3?: string;
    file4?: string;
}

export interface SortConfig {
    key: keyof CustomerRecord | 'Customer';
    direction: 'ascending' | 'descending';
}

export type AccountStatus = 'Active' | 'Inactive' | 'Pending';

// From: types.ts
export interface Account {
  accountID: string;
  accountType: string;
  subCategory: string;
  company: string;
  locationName: string;
  locationAddress: string;
  expiration: string;
  amountDue: number;
  billingType: string;
  billingAmount: number;
  paymentMethod: string;
  licenseNumber?: string;
  insuranceCarrier?: string;
  insuranceBroker?: string;
  notes?: string;
  status: AccountStatus | string;
  timestamp: string;
  fileUpload?: string;
}

export type AccountFormState = Omit<Account, 'accountID' | 'timestamp'>;

export interface AccountSortConfig {
    key: keyof Account;
    direction: 'ascending' | 'descending';
}

// New Types for Tasks and Directory

export type TaskStatus = 'To Do' | 'In Progress' | 'Pending Review' | 'Completed' | 'Canceled';
export type TaskPriority = 'Low' | 'Medium' | 'High' | 'Critical';

export interface Task {
  TaskID: string;
  'Task Name': string;
  'Due Date': string;
  'Task Description': string;
  Contact: string; // ContactID
  Account: string; // AccountID
  Status: TaskStatus | string;
  Priority: TaskPriority | string;
  Notes: string;
  'Completed On': string;
}

export type TaskFormState = Omit<Task, 'TaskID'>;

export interface Contact {
  ContactID: string;
  'First Name': string;
  'Last Name': string;
  'Phone Number': string;
  'Email Address': string;
  Address: string;
  'Company/Organization': string;
  'Job Title': string;
  Department: string;
  Status: string;
  Notes: string;
  'Created On': string;
}

export type ContactFormState = Omit<Contact, 'ContactID' | 'Created On'>;

// --- New Types for Financing Ledger ---

export type AgreementStatus = 'Active' | 'Paid Off' | 'On Hold' | 'Default';

export interface FinancingRecord {
  finance_id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  product_description: string;
  receipt_number: string;
  sale_date: string;
  sales_rep: string;
  store_name: string;
  total_sale_amount: number;
  down_payment_amount: number;
  financed_amount: number;
  installment_count: number;
  installment_amount: number;
  payment_method: string;
  payment_due_day: string;
  total_amount_paid: number;
  current_balance_due: number;
  agreement_status: AgreementStatus | string;
  notes_log: string;
  agreement_file: string;
  id_card_file_url: string;
  receipt_file: string;
  created_on: string;
  last_updated: string;
}

export type FinancingFormState = Omit<FinancingRecord, 'finance_id' | 'created_on' | 'last_updated'> & {
  // For tracking existing file URLs during update
  agreement_file?: string;
  id_card_file_url?: string;
  receipt_file?: string;
};

// --- New Type for User Authentication ---
export interface User {
  UserID: string;
  Name: string;
  Email: string;
  Phone: string;
  AccessCode: string;
  Role: 'Office' | 'Accounting' | string;
  Location: string;
}

// --- New Type for Emailing ---
export interface EmailPayload {
    to: string;
    subject: string;
    body: string;
    attachments?: {
        filename: string;
        mimeType: string;
        data: string; // base64
    }[];
    driveFileIds?: string[];
}