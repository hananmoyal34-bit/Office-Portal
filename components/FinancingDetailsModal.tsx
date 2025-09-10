import React from 'react';
import type { FinancingRecord } from '../types';
import Modal from './Modal';
import { formatCurrency, formatDateToMDY } from '../utils/formatting';
import ClipboardCopyButton from './ClipboardCopyButton';

interface FinancingDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    record: FinancingRecord;
}

const DetailItem: React.FC<{ label: string; value?: string | number | null; children?: React.ReactNode; copyValue?: string | number | null; }> = ({ label, value, children, copyValue }) => (
    <div>
        <p className="font-semibold text-sm text-gray-500">{label}</p>
        <div className="flex items-center justify-between bg-gray-50 p-2 rounded-md mt-1 text-sm min-h-[38px]">
            <span className="text-gray-900 whitespace-pre-wrap break-all flex-grow pr-2">{children || value || 'N/A'}</span>
            {copyValue != null && <ClipboardCopyButton textToCopy={String(copyValue)} />}
        </div>
    </div>
);

const FileLink: React.FC<{ label: string; url?: string | null }> = ({ label, url }) => (
  <div>
    <p className="font-semibold text-sm text-gray-500">{label}</p>
    {url ? (
      <a href={url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline mt-2 block truncate text-sm">
        View File
      </a>
    ) : (
      <p className="text-gray-400 mt-2 text-sm">Not provided</p>
    )}
  </div>
);


const getStatusClass = (status: string) => {
    const lowerStatus = (status || '').toLowerCase();
    if (lowerStatus === 'active') return 'bg-blue-100 text-blue-800';
    if (lowerStatus === 'paid off') return 'bg-green-100 text-green-800';
    if (lowerStatus === 'on hold') return 'bg-yellow-100 text-yellow-800';
    if (lowerStatus === 'default') return 'bg-red-100 text-red-800';
    return 'bg-gray-100 text-gray-800';
};

const FinancingDetailsModal: React.FC<FinancingDetailsModalProps> = ({ isOpen, onClose, record }) => {
    const modalFooter = <button onClick={onClose} className="px-4 py-2 text-sm bg-gray-200 rounded-md">Close</button>;
    
    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Agreement: ${record.finance_id}`} size="2xl" footer={modalFooter}>
            <div className="space-y-6">
                <section>
                    <h3 className="text-lg font-medium text-gray-900 border-b pb-2 mb-3">Customer & Sale Info</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <DetailItem label="Customer Name" value={record.customer_name} copyValue={record.customer_name} />
                        <DetailItem label="Email" value={record.customer_email} copyValue={record.customer_email} />
                        <DetailItem label="Phone" value={record.customer_phone} copyValue={record.customer_phone} />
                        <DetailItem label="Sale Date" value={formatDateToMDY(record.sale_date)} />
                        <DetailItem label="Sales Rep" value={record.sales_rep} />
                        <DetailItem label="Store" value={record.store_name} />
                        <div className="md:col-span-2"><DetailItem label="Product Description" value={record.product_description}/></div>
                    </div>
                </section>
                <section>
                    <h3 className="text-lg font-medium text-gray-900 border-b pb-2 mb-3">Financial Summary</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <DetailItem label="Total Sale" value={formatCurrency(record.total_sale_amount)} />
                        <DetailItem label="Down Payment" value={formatCurrency(record.down_payment_amount)} />
                        <DetailItem label="Amount Financed" value={formatCurrency(record.financed_amount)} />
                        <DetailItem label="Total Paid" value={formatCurrency(record.total_amount_paid)} />
                        <DetailItem label="Current Balance" value={formatCurrency(record.current_balance_due)}>
                           <span className="font-bold text-lg text-red-600">{formatCurrency(record.current_balance_due)}</span>
                        </DetailItem>
                        <DetailItem label="Status">
                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusClass(record.agreement_status)}`}>{record.agreement_status}</span>
                        </DetailItem>
                    </div>
                </section>
                <section>
                    <h3 className="text-lg font-medium text-gray-900 border-b pb-2 mb-3">Payment Plan</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <DetailItem label="# of Installments" value={record.installment_count} />
                        <DetailItem label="Installment Amount" value={formatCurrency(record.installment_amount)} />
                        <DetailItem label="Payment Method" value={record.payment_method} />
                        <DetailItem label="Day of Month Due" value={record.payment_due_day} />
                    </div>
                </section>
                <section>
                    <h3 className="text-lg font-medium text-gray-900 border-b pb-2 mb-3">Files & Notes</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        <FileLink label="Agreement File" url={record.agreement_file} />
                        <FileLink label="ID Card File" url={record.id_card_file_url} />
                        <FileLink label="Receipt File" url={record.receipt_file} />
                    </div>
                     <div className="mt-4">
                        <DetailItem label="Notes Log" value={record.notes_log} />
                     </div>
                </section>
                 <section>
                    <h3 className="text-lg font-medium text-gray-900 border-b pb-2 mb-3">Metadata</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-gray-500">
                        <DetailItem label="Finance ID" value={record.finance_id} copyValue={record.finance_id} />
                        <DetailItem label="Receipt Number" value={record.receipt_number} copyValue={record.receipt_number} />
                        <DetailItem label="Created On" value={formatDateToMDY(record.created_on)} />
                        <DetailItem label="Last Updated" value={formatDateToMDY(record.last_updated)} />
                    </div>
                </section>
            </div>
        </Modal>
    );
};

export default FinancingDetailsModal;
