import React from 'react';
import type { CustomerRecord, Status, SortConfig } from '../types';
import { EditIcon } from './icons/EditIcon';
import { DeleteIcon } from './icons/DeleteIcon';
import { ViewIcon } from './icons/ViewIcon';
import Tooltip from './Tooltip';
import { SortIcon } from './icons/SortIcon';
import { ChevronIcon } from './icons/ChevronIcon';
import Spinner from './Spinner';

interface CustomerTableProps {
    records: CustomerRecord[];
    searchQuery: string;
    sortConfig: SortConfig;
    onSort: (key: keyof CustomerRecord | 'Customer') => void;
    onEdit: (record: CustomerRecord) => void;
    onDelete: (record: CustomerRecord) => void;
    onViewDetails: (record: CustomerRecord) => void;
    onStatusChange: (ticketId: string, status: Status | string) => void;
    isClosedTab: boolean;
    collapsedStatuses: Set<string>;
    onToggleCollapse: (status: string) => void;
    actionTarget: { action: string, ticketId: string } | null;
    allHeaders: { key: keyof CustomerRecord | 'Customer'; label: string }[];
    visibleColumnKeys: Set<keyof CustomerRecord | 'Customer'>;
}

const SortableHeader: React.FC<{
    title: string;
    sortKey: keyof CustomerRecord | 'Customer';
    sortConfig: SortConfig;
    onSort: (key: keyof CustomerRecord | 'Customer') => void;
}> = ({ title, sortKey, sortConfig, onSort }) => {
    const isSorting = sortConfig.key === sortKey;
    return (
        <th scope="col" className="px-6 py-3 cursor-pointer" onClick={() => onSort(sortKey)}>
            <div className="flex items-center gap-2">
                {title}
                <SortIcon
                    direction={isSorting ? sortConfig.direction : 'none'}
                />
            </div>
        </th>
    );
};

const getStatusClass = (status: string) => {
    const baseStyles = "w-full text-left px-2 py-1 text-xs font-semibold rounded-md appearance-none focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-surface focus:ring-primary border";
    switch (status.toLowerCase()) {
        case 'new': return `${baseStyles} bg-indigo-100 text-indigo-800 border-indigo-300`;
        case 'in progress': return `${baseStyles} bg-amber-100 text-amber-800 border-amber-300`;
        case 'closed': return `${baseStyles} bg-gray-200 text-gray-800 border-gray-300`;
        default: return `${baseStyles} bg-gray-100 text-gray-700 border-gray-300`;
    }
};

const getCategoryClass = (category: string) => {
    const baseStyles = "px-2 py-1 text-xs font-semibold rounded-full inline-block whitespace-nowrap";
    return `${baseStyles} bg-gray-100 text-gray-800`;
};

const getCellContent = (record: CustomerRecord, key: keyof CustomerRecord | 'Customer'): React.ReactNode => {
    switch (key) {
        case 'Customer':
            return (
                <div>
                    <div className="font-semibold text-on-surface">{record['First Name']} {record['Last Name']}</div>
                    <div className="text-xs text-gray-600">{record['Email Address']}</div>
                </div>
            );
        case 'Timestamp':
            return record.Timestamp ? new Date(record.Timestamp).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : 'N/A';
        case 'Ticket Category':
            return (
                <span className={getCategoryClass(record['Ticket Category'])}>
                    {record['Ticket Category']}
                </span>
            );
        case 'TicketID':
            return (
                <span className="text-on-surface whitespace-nowrap">
                    {record.TicketID}
                </span>
            );
        default:
            const value = record[key as keyof CustomerRecord];
            return value || '';
    }
};

const CustomerTable: React.FC<CustomerTableProps> = ({ records, searchQuery, sortConfig, onSort, onEdit, onDelete, onViewDetails, onStatusChange, isClosedTab, collapsedStatuses, onToggleCollapse, actionTarget, allHeaders, visibleColumnKeys }) => {

    const visibleHeaders = allHeaders.filter(h => visibleColumnKeys.has(h.key));

    if (records.length === 0) {
        const message = searchQuery
            ? `No records found matching your search.`
            : isClosedTab ? "No closed records." : "No open records.";
        return <p className="text-center text-on-surface-secondary py-10 px-4">{message}</p>;
    }

    let lastStatus: string | null = null;

    return (
        <>
            {/* Mobile View: Cards */}
            <div className="md:hidden p-2 space-y-3">
                {records.map(record => {
                    const isActionTarget = actionTarget?.ticketId === record.TicketID;
                    return (
                        <div key={record.TicketID} className="bg-surface border border-border-color rounded-lg p-4 shadow-sm hover:bg-gray-50 cursor-pointer" onClick={() => onViewDetails(record)}>
                           <div className="flex justify-between items-start mb-3">
                                <div>
                                    <p className="font-bold text-on-surface">{record['First Name']} {record['Last Name']}</p>
                                    <p className="text-xs text-gray-600">ID: {record.TicketID}</p>
                                </div>
                                <span className={getCategoryClass(record['Ticket Category'])}>
                                    {record['Ticket Category']}
                                </span>
                            </div>
                            <div className="mb-4 text-sm text-gray-600">
                                Submitted: {record.Timestamp ? new Date(record.Timestamp).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : 'N/A'}
                            </div>

                            <div className="flex flex-col sm:flex-row items-center gap-4" onClick={(e) => e.stopPropagation()}>
                                <div className="w-full sm:flex-1">
                                    <select
                                        value={record.Status}
                                        onChange={(e) => onStatusChange(record.TicketID, e.target.value)}
                                        className={getStatusClass(record.Status)}
                                        aria-label={`Status for ticket ${record.TicketID}`}
                                    >
                                        <option value="New">New</option>
                                        <option value="In Progress">In Progress</option>
                                        <option value="Closed">Closed</option>
                                    </select>
                                </div>
                                <div className="flex items-center justify-end gap-4 w-full sm:w-auto">
                                    <Tooltip text="View Details">
                                        <button onClick={() => onViewDetails(record)} className="text-emerald-500 hover:text-emerald-700 transition-colors disabled:text-gray-400 disabled:cursor-wait" aria-label="View Details" disabled={isActionTarget}>
                                            {isActionTarget && actionTarget.action === 'view' ? <Spinner size="sm"/> : <ViewIcon />}
                                        </button>
                                    </Tooltip>
                                    <Tooltip text="Edit Record">
                                        <button onClick={() => onEdit(record)} className="text-sky-500 hover:text-sky-700 transition-colors disabled:text-gray-400 disabled:cursor-wait" aria-label="Edit" disabled={isActionTarget}>
                                            {isActionTarget && actionTarget.action === 'edit' ? <Spinner size="sm"/> : <EditIcon />}
                                        </button>
                                    </Tooltip>
                                    <Tooltip text="Delete Record">
                                        <button onClick={() => onDelete(record)} className="text-red-500 hover:text-red-700 transition-colors disabled:text-gray-400 disabled:cursor-wait" aria-label="Delete" disabled={isActionTarget}>
                                            {isActionTarget && actionTarget.action === 'delete' ? <Spinner size="sm"/> : <DeleteIcon />}
                                        </button>
                                    </Tooltip>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Desktop View: Table */}
            <div className="hidden md:block overflow-x-auto relative max-h-[65vh]">
                <table className="w-full text-sm text-left text-gray-700">
                    <thead className="text-xs text-on-surface uppercase bg-gray-50 border-b-2 border-border-color sticky top-0 z-10">
                        <tr>
                            {visibleHeaders.map(header => (
                                <SortableHeader
                                    key={String(header.key)}
                                    title={header.label}
                                    sortKey={header.key}
                                    sortConfig={sortConfig}
                                    onSort={onSort}
                                />
                            ))}
                            <th scope="col" className="px-6 py-3">Status</th>
                            <th scope="col" className="px-6 py-3 text-center">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {records.map((record) => {
                            const isCollapsed = collapsedStatuses.has(record.Status);
                            const showStatusHeader = record.Status !== lastStatus && !isClosedTab;
                            lastStatus = record.Status;
                            const isActionTarget = actionTarget?.ticketId === record.TicketID;

                            return (
                                <React.Fragment key={record.TicketID}>
                                    {showStatusHeader && (
                                        <tr 
                                            className="bg-gray-100/95 backdrop-blur-sm sticky top-[41px] z-[9] border-b border-t border-gray-200 cursor-pointer hover:bg-gray-200 transition-colors"
                                            onClick={() => onToggleCollapse(record.Status)}
                                            aria-expanded={!isCollapsed}
                                        >
                                            <th colSpan={visibleHeaders.length + 2} className="px-6 py-2 text-left text-sm font-bold text-on-surface select-none">
                                                <div className="flex items-center gap-2">
                                                    <ChevronIcon isCollapsed={isCollapsed} />
                                                    {record.Status}
                                                </div>
                                            </th>
                                        </tr>
                                    )}
                                    {!isCollapsed && (
                                        <tr 
                                            className="odd:bg-white even:bg-gray-50/70 border-b border-border-color hover:bg-indigo-50 cursor-pointer"
                                            onClick={() => onViewDetails(record)}
                                        >
                                            {visibleHeaders.map((header, index) => {
                                                if (index === 0) {
                                                    return (
                                                        <th scope="row" className="px-6 py-4 font-medium text-on-surface" key={String(header.key)}>
                                                            {getCellContent(record, header.key)}
                                                        </th>
                                                    );
                                                }
                                                return (
                                                    <td className="px-6 py-4" key={String(header.key)}>
                                                        {getCellContent(record, header.key)}
                                                    </td>
                                                );
                                            })}
                                            <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                                            <select
                                                    value={record.Status}
                                                    onChange={(e) => onStatusChange(record.TicketID, e.target.value)}
                                                    className={getStatusClass(record.Status)}
                                                    aria-label={`Status for ticket ${record.TicketID}`}
                                                >
                                                    <option value="New">New</option>
                                                    <option value="In Progress">In Progress</option>
                                                    <option value="Closed">Closed</option>
                                                </select>
                                            </td>
                                            <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                                                <div className="flex items-center justify-center gap-4">
                                                    <Tooltip text="View Details">
                                                        <button onClick={() => onViewDetails(record)} className="text-emerald-500 hover:text-emerald-700 transition-colors disabled:text-gray-400 disabled:cursor-wait" aria-label="View Details" disabled={isActionTarget}>
                                                            {isActionTarget && actionTarget.action === 'view' ? <Spinner size="sm"/> : <ViewIcon />}
                                                        </button>
                                                    </Tooltip>
                                                    <Tooltip text="Edit Record">
                                                        <button onClick={() => onEdit(record)} className="text-sky-500 hover:text-sky-700 transition-colors disabled:text-gray-400 disabled:cursor-wait" aria-label="Edit" disabled={isActionTarget}>
                                                            {isActionTarget && actionTarget.action === 'edit' ? <Spinner size="sm"/> : <EditIcon />}
                                                        </button>
                                                    </Tooltip>
                                                    <Tooltip text="Delete Record">
                                                        <button onClick={() => onDelete(record)} className="text-red-500 hover:text-red-700 transition-colors disabled:text-gray-400 disabled:cursor-wait" aria-label="Delete" disabled={isActionTarget}>
                                                            {isActionTarget && actionTarget.action === 'delete' ? <Spinner size="sm"/> : <DeleteIcon />}
                                                        </button>
                                                    </Tooltip>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            )
                        })}
                    </tbody>
                </table>
            </div>
        </>
    );
};

export default CustomerTable;