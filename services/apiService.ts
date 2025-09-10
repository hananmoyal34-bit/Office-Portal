import { WEB_APP_URL } from '../constants';
import type { CustomerRecord, FileForUpload, FormState, Account, Task, Contact, TaskFormState, ContactFormState, FinancingRecord, FinancingFormState, User, EmailPayload } from '../types';

async function handleResponse<T,>(response: Response): Promise<T> {
    if (!response.ok) {
        const errorText = await response.text();
        try {
            const jsonError = JSON.parse(errorText);
            throw new Error(jsonError.message || `HTTP error! status: ${response.status}`);
        } catch(e) {
            throw new Error(errorText || `HTTP error! status: ${response.status}`);
        }
    }
    const json = await response.json();
    if (json.status === "success") {
        return json.data || json;
    }
    throw new Error(json.message || 'An API error occurred.');
}

async function postToAction(action: string, payload: any) {
     const response = await fetch(WEB_APP_URL, {
        method: 'POST',
        body: JSON.stringify({ action, payload }),
        headers: {
            'Content-Type': 'text/plain;charset=utf-8',
        },
    });
    return handleResponse(response);
}

// --- Auth API ---
export const loginUser = async (accessCode: string, role: 'Office' | 'Accounting'): Promise<User> => {
    const url = new URL(WEB_APP_URL);
    url.searchParams.append('action', 'login');
    url.searchParams.append('accessCode', accessCode);
    url.searchParams.append('role', role);
    const response = await fetch(url.toString());
    return handleResponse<User>(response);
};

// --- CS Hub API ---
export const getAllRecords = async (): Promise<CustomerRecord[]> => {
    const response = await fetch(WEB_APP_URL);
    return handleResponse<CustomerRecord[]>(response);
};

export const createRecord = async (formData: FormState, files: FileForUpload[]): Promise<any> => {
    const body = { formType: 'create', formData: formData, files: files };
    const response = await fetch(WEB_APP_URL, {
        method: 'POST', body: JSON.stringify(body), headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    });
    return handleResponse(response);
};

export const updateRecord = async (formData: FormState, files: FileForUpload[]): Promise<any> => {
     const body = { formType: 'update', formData: formData, files: files };
    const response = await fetch(WEB_APP_URL, {
        method: 'POST', body: JSON.stringify(body), headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    });
    return handleResponse(response);
}

export const deleteRecord = async (ticketId: string): Promise<any> => {
    const url = new URL(WEB_APP_URL);
    url.searchParams.append('action', 'delete');
    url.searchParams.append('ticketId', ticketId);
    const response = await fetch(url.toString());
    return handleResponse(response);
}

export const sendEmail = (payload: EmailPayload) => postToAction('sendEmail', payload);


// --- Generic Row Parser ---
function parseRows<T>(rows: any[][], keys: (keyof T)[]): T[] {
    // The new Google Apps Script response for these endpoints no longer includes the header row in the `rows` array.
    // This function is updated to reflect that, removing the slice(1) and adjusting the empty check.
    if (!rows || rows.length === 0) return [];
    
    return rows.map(row => {
        const obj: Partial<T> = {};
        keys.forEach((key, index) => {
            // @ts-ignore
            obj[key] = row[index];
        });
        return obj as T;
    }).filter(obj => obj && obj[keys[0]]); // Filter out rows where the ID is missing
}

// --- Accounts API ---
export const getAccounts = async (): Promise<Account[]> => {
    const url = new URL(WEB_APP_URL);
    url.searchParams.append('action', 'getAccounts');
    const response = await fetch(url.toString());
    const result = await handleResponse<{headers: string[], rows: any[][]}>(response);

    const accountKeys: (keyof Account)[] = ['accountID', 'accountType', 'subCategory', 'company', 'locationName', 'locationAddress', 'expiration', 'amountDue', 'billingType', 'billingAmount', 'paymentMethod', 'licenseNumber', 'insuranceCarrier', 'insuranceBroker', 'notes', 'status', 'timestamp', 'fileUpload'];
    const parsed = parseRows<Account>(result.rows, accountKeys);
    return parsed.map(acc => ({ ...acc, amountDue: parseFloat(String(acc.amountDue)) || 0, billingAmount: parseFloat(String(acc.billingAmount)) || 0 }));
};
export const addAccount = (accountData: Omit<Account, 'accountID' | 'timestamp'>, file: FileForUpload | null) => postToAction('addAccount', { ...accountData, file: file });
export const updateAccount = (accountData: Account, file: FileForUpload | null) => postToAction('updateAccount', { ...accountData, file: file });
export const deleteAccount = (accountID: string) => postToAction('deleteAccount', { accountID });

// --- Directory API ---
export const getDirectory = async (): Promise<Contact[]> => {
    const url = new URL(WEB_APP_URL);
    url.searchParams.append('action', 'getDirectory');
    const response = await fetch(url.toString());
    const result = await handleResponse<{headers: string[], rows: any[][]}>(response);
    const contactKeys: (keyof Contact)[] = ['ContactID', 'First Name', 'Last Name', 'Phone Number', 'Email Address', 'Address', 'Company/Organization', 'Job Title', 'Department', 'Status', 'Notes', 'Created On'];
    return parseRows<Contact>(result.rows, contactKeys);
};
export const addContact = (contactData: ContactFormState) => postToAction('addContact', contactData);
export const updateContact = (contactData: Contact) => postToAction('updateContact', contactData);
export const deleteContact = (ContactID: string) => postToAction('deleteContact', { ContactID });

// --- Tasks API ---
export const getTasks = async (): Promise<Task[]> => {
    const url = new URL(WEB_APP_URL);
    url.searchParams.append('action', 'getTasks');
    const response = await fetch(url.toString());
    const result = await handleResponse<{headers: string[], rows: any[][]}>(response);
    const taskKeys: (keyof Task)[] = ['TaskID', 'Task Name', 'Due Date', 'Task Description', 'Contact', 'Account', 'Status', 'Priority', 'Notes', 'Completed On'];
    return parseRows<Task>(result.rows, taskKeys);
};
export const addTask = (taskData: TaskFormState) => postToAction('addTask', taskData);
export const updateTask = (taskData: Task) => postToAction('updateTask', taskData);
export const deleteTask = (TaskID: string) => postToAction('deleteTask', { TaskID });

// --- Financing Ledger API ---
export const getFinancingLedger = async (): Promise<FinancingRecord[]> => {
    const url = new URL(WEB_APP_URL);
    url.searchParams.append('action', 'getFinancingLedger');
    const response = await fetch(url.toString());
    const result = await handleResponse<{ rows: any[][] }>(response);
    const financingKeys: (keyof FinancingRecord)[] = [
        'finance_id', 'customer_name', 'customer_email', 'customer_phone', 'product_description',
        'receipt_number', 'sale_date', 'sales_rep', 'store_name', 'total_sale_amount',
        'down_payment_amount', 'financed_amount', 'installment_count', 'installment_amount',
        'payment_method', 'payment_due_day', 'total_amount_paid', 'current_balance_due',
        'agreement_status', 'notes_log', 'agreement_file', 'id_card_file_url', 'receipt_file',
        'created_on', 'last_updated'
    ];
    const parsed = parseRows<FinancingRecord>(result.rows, financingKeys);
    // Convert numeric fields from string to number
    return parsed.map(rec => ({
        ...rec,
        total_sale_amount: parseFloat(String(rec.total_sale_amount)) || 0,
        down_payment_amount: parseFloat(String(rec.down_payment_amount)) || 0,
        financed_amount: parseFloat(String(rec.financed_amount)) || 0,
        installment_count: parseInt(String(rec.installment_count), 10) || 0,
        installment_amount: parseFloat(String(rec.installment_amount)) || 0,
        total_amount_paid: parseFloat(String(rec.total_amount_paid)) || 0,
        current_balance_due: parseFloat(String(rec.current_balance_due)) || 0,
    }));
};

export const addFinancingRecord = (recordData: FinancingFormState, files: FileForUpload[]) => postToAction('addFinancingRecord', { ...recordData, files });
export const updateFinancingRecord = (recordData: FinancingRecord, files: FileForUpload[]) => postToAction('updateFinancingRecord', { ...recordData, files });
export const deleteFinancingRecord = (finance_id: string) => postToAction('deleteFinancingRecord', { finance_id });