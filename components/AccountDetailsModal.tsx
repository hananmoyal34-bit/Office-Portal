import React from 'react';
import type { Account } from '../types';
import Modal from './Modal';
import { formatCurrency, formatDateToMDY } from '../utils/formatting';
import ClipboardCopyButton from './ClipboardCopyButton';

interface AccountDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    account: Account;
}

const DetailItem: React.FC<{ label: string; value?: string | number | null; children?: React.ReactNode, copyValue?: string | number | null; }> = ({ label, value, children, copyValue }) => {
    const displayValue = children ? children : (value || value === 0 ? String(value) : 'Not provided');

    return (
        <div>
            <p className="font-semibold text-sm text-gray-500">{label}</p>
            <div className="flex items-center justify-between bg-gray-50 p-2 rounded-md mt-1 text-sm min-h-[38px]">
                <span className="text-gray-900 whitespace-pre-wrap break-all flex-grow pr-2">{displayValue}</span>
                {copyValue != null && <ClipboardCopyButton textToCopy={String(copyValue)} />}
            </div>
        </div>
    );
};

const getStatusClass = (status: string) => {
    const lowerStatus = (status || '').toLowerCase();
    if (lowerStatus === 'active') return 'bg-green-100 text-green-800';
    if (lowerStatus === 'inactive') return 'bg-red-100 text-red-800';
    if (lowerStatus === 'pending') return 'bg-yellow-100 text-yellow-800';
    return 'bg-gray-100 text-gray-800';
};

const AccountDetailsModal: React.FC<AccountDetailsModalProps> = ({ isOpen, onClose, account }) => {
    if (!isOpen) return null;

    const modalFooter = (
        <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
            Close
        </button>
    );

    const modalTitle = (
        <div className="flex items-center">
            <span>{`Details for ${account.company}`}</span>
            <ClipboardCopyButton textToCopy={account.company} />
        </div>
    );

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={modalTitle}
            size="2xl"
            footer={modalFooter}
        >
            <div className="space-y-6">
                <div>
                    <h3 className="text-lg font-medium text-gray-900 border-b border-gray-200 pb-2 mb-3">General Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                        <DetailItem label="Account Type" value={account.accountType} copyValue={account.accountType} />
                        <DetailItem label="Sub Category" value={account.subCategory} copyValue={account.subCategory} />
                        <DetailItem label="Location Name" value={account.locationName} copyValue={account.locationName} />
                        <DetailItem label="Location Address" value={account.locationAddress} copyValue={account.locationAddress} />
                        <DetailItem label="Status">
                            <span className={`px-2 py-1 text-xs font-semibold leading-4 rounded-full ${getStatusClass(account.status)}`}>
                                {account.status}
                            </span>
                        </DetailItem>
                    </div>
                </div>

                <div>
                    <h3 className="text-lg font-medium text-gray-900 border-b border-gray-200 pb-2 mb-3">Financial Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                        <DetailItem label="Amount Due" value={formatCurrency(account.amountDue)} copyValue={account.amountDue} />
                        <DetailItem label="Billing Amount" value={formatCurrency(account.billingAmount)} copyValue={account.billingAmount} />
                        <DetailItem label="Billing Type" value={account.billingType} copyValue={account.billingType} />
                        <DetailItem label="Payment Method" value={account.paymentMethod} copyValue={account.paymentMethod}/>
                    </div>
                </div>

                <div>
                    <h3 className="text-lg font-medium text-gray-900 border-b border-gray-200 pb-2 mb-3">Licensing & Insurance</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                        <DetailItem label="Expiration Date" value={formatDateToMDY(account.expiration)} copyValue={account.expiration} />
                        <DetailItem label="License Number" value={account.licenseNumber} copyValue={account.licenseNumber} />
                        <DetailItem label="Insurance Carrier" value={account.insuranceCarrier} copyValue={account.insuranceCarrier} />
                        <DetailItem label="Insurance Broker" value={account.insuranceBroker} copyValue={account.insuranceBroker} />
                    </div>
                </div>

                <div>
                    <h3 className="text-lg font-medium text-gray-900 border-b border-gray-200 pb-2 mb-3">Attachments</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                         <DetailItem label="File">
                            {account.fileUpload ? (
                                <a href={account.fileUpload} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                                    View Uploaded File
                                </a>
                            ) : (
                                'Not provided'
                            )}
                        </DetailItem>
                    </div>
                </div>

                <div>
                    <h3 className="text-lg font-medium text-gray-900 border-b border-gray-200 pb-2 mb-3">Notes & Metadata</h3>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                        <div className="md:col-span-2">
                            <DetailItem label="Notes" value={account.notes} copyValue={account.notes} />
                        </div>
                        <DetailItem label="Last Updated" value={formatDateToMDY(account.timestamp)} />
                        <DetailItem label="Account ID" value={account.accountID} copyValue={account.accountID} />
                    </div>
                </div>
            </div>
        </Modal>
    );
};

export default AccountDetailsModal;