/**
 * =================================================================================
 * | UNIFIED BACKEND SCRIPT FOR CUSTOMER SERVICE HUB & OTHER MODULES               |
 * =================================================================================
 * * This script serves as the complete backend for your web application.
 * It handles CSHub, Accounts, Tasks, Directory, Products, and Financing Ledger modules.
 * * DEPLOYMENT:
 * 1. Open your Apps Script project connected to your Google Sheet.
 * 2. Delete all existing code in the `Code.gs` file.
 * 3. Copy this entire script and paste it into the empty `Code.gs` file.
 * 4. Go to Deploy > New deployment.
 * 5. Select Type: Web app.
 * 6. Description: "Unified API with Financing".
 * 7. Execute as: Me.
 * 8. Who has access: Anyone.
 * 9. Click Deploy and authorize the script's permissions.
 * 10. The provided Web app URL should already be configured in the application, but you can verify it matches.
 */

// --- GLOBAL CONFIGURATION ---

const PARENT_DRIVE_FOLDER_ID = "1QjQa8ysmW090zhUKHp4FwrWrLVP84OES";
const ACCOUNTS_DRIVE_FOLDER_ID = "1woJp_hwk_SPwDW9EtoWYGJHNsGahE60c";
const EMAIL_DOC_TEMPLATE_ID = "1oIsTe2oZ_YvPwFBs13xsrrrmaM24uAQDzvWMxnTW2IE";
const OFFICE_EMAIL = "info@retailtechcare.com";

const SHEET_NAMES = {
  customerService: "Customer Service Hub",
  accounts: "Accounts",
  tasks: "Tasks",
  directory: "Directory",
  products: "Products",
  financingLedger: "FinancingLedger",
  users: "Users" // Added Users sheet
};

const CACHE_EXPIRATION_SECONDS = 300; // 5 minutes

// --- ROUTERS (doPost/doGet) ---

/**
 * Handles all POST requests. Routes to the appropriate handler and invalidates cache.
 */
function doPost(e) {
  try {
    const request = JSON.parse(e.postData.contents);
    let response;
    let sheetToInvalidate;

    // Route for new modular actions (Accounts, Tasks, Directory, Financing)
    if (request.action) {
      const payload = request.payload || {};
      switch (request.action) {
        // Accounts
        case 'addAccount': case 'updateAccount': case 'deleteAccount':
          sheetToInvalidate = SHEET_NAMES.accounts;
          if (request.action === 'addAccount') response = handleAddAccount(payload);
          if (request.action === 'updateAccount') response = handleUpdateAccount(payload);
          if (request.action === 'deleteAccount') response = handleDeleteAccount(payload);
          break;
        // Tasks
        case 'addTask': case 'updateTask': case 'deleteTask':
          sheetToInvalidate = SHEET_NAMES.tasks;
          if (request.action === 'addTask') response = handleAddTask(payload);
          if (request.action === 'updateTask') response = handleUpdateTask(payload);
          if (request.action === 'deleteTask') response = handleDeleteTask(payload);
          break;
        // Directory
        case 'addContact': case 'updateContact': case 'deleteContact':
          sheetToInvalidate = SHEET_NAMES.directory;
          if (request.action === 'addContact') response = handleAddContact(payload);
          if (request.action === 'updateContact') response = handleUpdateContact(payload);
          if (request.action === 'deleteContact') response = handleDeleteContact(payload);
          break;
        // Financing Ledger
        case 'addFinancingRecord': case 'updateFinancingRecord': case 'deleteFinancingRecord':
          sheetToInvalidate = SHEET_NAMES.financingLedger;
          if (request.action === 'addFinancingRecord') response = handleAddFinancingRecord(payload);
          if (request.action === 'updateFinancingRecord') response = handleUpdateFinancingRecord(payload);
          if (request.action === 'deleteFinancingRecord') response = handleDeleteFinancingRecord(payload);
          break;
        default:
          throw new Error("Unknown POST action: " + request.action);
      }
    } 
    // Route for legacy CSHub requests from the web app
    else if (request.formType === 'create' || request.formType === 'update') {
      sheetToInvalidate = SHEET_NAMES.customerService;
      const sheet = getSheet(sheetToInvalidate);
      if (request.formType === 'update') {
        response = updateRecord(sheet, request.formData, request.files || []);
      } else {
        response = createRecord(sheet, request.formType, request.formData, request.files || []);
      }
    } else {
      throw new Error("Invalid POST request format.");
    }
    
    // Invalidate cache on a successful write operation
    if (response.status === 'success' && sheetToInvalidate) {
        clearCache(sheetToInvalidate);
    }

    return ContentService
      .createTextOutput(JSON.stringify(response))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    Logger.log("POST Error: " + error.toString() + "\nStack: " + error.stack);
    return ContentService
      .createTextOutput(JSON.stringify({ status: "error", message: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Handles all GET requests. Uses caching to speed up responses.
 */
function doGet(e) {
  try {
    const action = e.parameter.action;
    let sheetName;
    
    // CSHub legacy delete is a GET, must invalidate cache
    if (action === 'delete') { 
        const csSheet = getSheet(SHEET_NAMES.customerService);
        const response = deleteRecord(csSheet, e.parameter.ticketId);
        clearCache(SHEET_NAMES.customerService);
        return response;
    }
    
    // Handle login action separately
    if (action === 'login') {
      const accessCode = e.parameter.accessCode;
      const role = e.parameter.role;
      if (!accessCode) throw new Error("Access code is required.");
      if (!role) throw new Error("Role is required.");

      const usersSheet = getSheet(SHEET_NAMES.users);
      const data = usersSheet.getDataRange().getValues();
      const headers = data.shift();
      const accessCodeIndex = headers.indexOf('AccessCode');
      const roleIndex = headers.indexOf('Role');

      if (accessCodeIndex === -1) throw new Error("AccessCode column not found in Users sheet.");
      if (roleIndex === -1) throw new Error("Role column not found in Users sheet.");

      // IMPORTANT FIX: Convert both values to strings and trim whitespace for a reliable comparison.
      const userRow = data.find(row => 
          String(row[accessCodeIndex]).trim() === String(accessCode).trim() && 
          String(row[roleIndex]).trim() === String(role).trim()
      );

      if (userRow) {
        const userObject = {};
        headers.forEach((header, index) => {
          userObject[header] = userRow[index];
        });
        return ContentService
          .createTextOutput(JSON.stringify({ status: "success", data: userObject }))
          .setMimeType(ContentService.MimeType.JSON);
      } else {
        throw new Error("Invalid access code for the selected portal.");
      }
    }

    // Route GET requests to the correct sheet
    switch(action) {
        case 'getAccounts': sheetName = SHEET_NAMES.accounts; break;
        case 'getTasks': sheetName = SHEET_NAMES.tasks; break;
        case 'getDirectory': sheetName = SHEET_NAMES.directory; break;
        case 'getProducts': sheetName = SHEET_NAMES.products; break;
        case 'getFinancingLedger': sheetName = SHEET_NAMES.financingLedger; break;
        default: sheetName = SHEET_NAMES.customerService; break; // Default to CSHub
    }
    
    // Fetch data using the caching mechanism
    const cachedData = getDataWithCache(sheetName, () => {
        const sheet = getSheet(sheetName);
        const data = sheet.getDataRange().getValues();
        const headers = data.shift() || []; // Get and remove header row

        // Customer Service Hub: Convert rows to an array of objects
        if (sheetName === SHEET_NAMES.customerService) {
          return data.map(row => {
            const recordObject = {};
            headers.forEach((header, index) => {
              recordObject[header] = row[index];
            });
            return recordObject;
          });
        }

        // Products Sheet: Select specific columns and convert to an array of objects
        if (sheetName === SHEET_NAMES.products) {
          const desiredHeaders = ['Items', 'Colors', 'Category', 'Sub-Category'];
          const indices = desiredHeaders.map(h => headers.indexOf(h));
          
          if (indices.some(index => index === -1)) {
            const missing = desiredHeaders.filter((h, i) => indices[i] === -1);
            throw new Error(`Missing columns in 'Products' sheet: ${missing.join(', ')}`);
          }
          
          return data.map(row => ({
            'Item': row[indices[0]],
            'Color': row[indices[1]],
            'Category': row[indices[2]],
            'SubCategory': row[indices[3]],
          }));
        }
        
        // Default for other sheets (Accounts, Tasks, Financing, etc.): Return raw rows (without header)
        return { headers: headers, rows: data }; 
    });

    const finalPayload = { status: "success", data: cachedData };
    
    return ContentService
      .createTextOutput(JSON.stringify(finalPayload))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    Logger.log("GET Error: " + error.toString());
    return ContentService
      .createTextOutput(JSON.stringify({ status: "error", message: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// --- CACHING FUNCTIONS ---
function getCache() { return CacheService.getScriptCache(); }
function clearCache(sheetName) { getCache().remove(sheetName); Logger.log("Cache cleared for: " + sheetName); }
function getDataWithCache(sheetName, fetchFunction) {
    const cache = getCache();
    const cached = cache.get(sheetName);
    if (cached != null) {
        Logger.log("Cache HIT for: " + sheetName);
        return JSON.parse(cached);
    }

    // Use a lock to prevent race conditions when multiple requests miss the cache at the same time.
    const lock = LockService.getScriptLock();
    lock.waitLock(30000); // Wait up to 30 seconds.

    try {
        // After acquiring the lock, check the cache again in case another process populated it while we were waiting.
        const cachedAfterLock = cache.get(sheetName);
        if (cachedAfterLock != null) {
            Logger.log("Cache HIT (after lock) for: " + sheetName);
            return JSON.parse(cachedAfterLock);
        }

        Logger.log("Cache MISS for: " + sheetName);
        const data = fetchFunction();
        cache.put(sheetName, JSON.stringify(data), CACHE_EXPIRATION_SECONDS);
        return data;
    } finally {
        // Always release the lock to avoid deadlocks.
        lock.releaseLock();
    }
}

// --- GENERIC CRUD HANDLERS (for modules other than CSHub) ---
function genericAdd(sheetName, payload, idPrefix, idKey, autoTimestampKey) {
  const sheet = getSheet(sheetName);
  const newId = idPrefix + Math.random().toString(36).slice(2, 11);
  payload[idKey] = newId;
  if(autoTimestampKey) { payload[autoTimestampKey] = new Date(); }
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const newRow = headers.map(header => payload[header] || '');
  sheet.appendRow(newRow);
  return { status: 'success', message: `${sheetName.slice(0, -1)} added successfully.` };
}
function genericUpdate(sheetName, payload, idKey, autoTimestampKey) {
    const sheet = getSheet(sheetName);
    const id = payload[idKey];
    if (!id) throw new Error(`${idKey} is required for update.`);
    const rowInfo = findRowByHeaderValue(sheet, id, idKey);
    if (!rowInfo) throw new Error(`${sheetName.slice(0, -1)} with ID ${id} not found.`);
    if (autoTimestampKey) { payload[autoTimestampKey] = new Date(); }
    const headers = rowInfo.headers;
    const newRowData = headers.map((header, index) => {
        return payload.hasOwnProperty(header) ? payload[header] : rowInfo.rowData[index];
    });
    sheet.getRange(rowInfo.rowIndex, 1, 1, newRowData.length).setValues([newRowData]);
    return { status: 'success', message: `${sheetName.slice(0, -1)} updated successfully.` };
}
function genericDelete(sheetName, payload, idKey) {
    const sheet = getSheet(sheetName);
    const id = payload[idKey];
    if (!id) throw new Error(`${idKey} is required for deletion.`);
    const rowInfo = findRowByHeaderValue(sheet, id, idKey);
    if (rowInfo) {
        sheet.deleteRow(rowInfo.rowIndex);
        return { status: 'success', message: `${sheetName.slice(0, -1)} deleted successfully.` };
    }
    throw new Error(`${sheetName.slice(0, -1)} ID not found for deletion: ${id}`);
}


// --- FINANCING LEDGER MODULE ---

function handleAddFinancingRecord(payload) {
  const sheet = getSheet(SHEET_NAMES.financingLedger);
  const newId = "FIN-" + Math.random().toString(36).slice(2, 11).toUpperCase();
  const now = new Date();
  
  let fileUrls = {};
  if (payload.files && payload.files.length > 0) {
      const parentFolder = DriveApp.getFolderById(PARENT_DRIVE_FOLDER_ID);
      fileUrls = uploadFilesToDrive(parentFolder, payload.customer_name, newId, payload.files);
  }

  payload.finance_id = newId;
  payload.created_on = now;
  payload.last_updated = now;

  for (const key in fileUrls) { payload[key] = fileUrls[key]; }

  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const newRow = headers.map(header => payload[header] || '');
  
  sheet.appendRow(newRow);
  return { status: 'success', message: 'Financing record added successfully.' };
}

function handleUpdateFinancingRecord(payload) {
  const sheet = getSheet(SHEET_NAMES.financingLedger);
  const financeId = payload.finance_id;
  if (!financeId) throw new Error("finance_id is required for update.");
  
  const rowInfo = findRowByHeaderValue(sheet, financeId, 'finance_id');
  if (!rowInfo) throw new Error(`Financing record with ID ${financeId} not found.`);

  let fileUrls = {};
  if (payload.files && payload.files.length > 0) {
      const parentFolder = DriveApp.getFolderById(PARENT_DRIVE_FOLDER_ID);
      fileUrls = uploadFilesToDrive(parentFolder, payload.customer_name, financeId, payload.files);
  }

  payload.last_updated = new Date();
  
  for (const key in fileUrls) { payload[key] = fileUrls[key]; }

  const headers = rowInfo.headers;
  const newRowData = headers.map((header, index) => {
    return payload.hasOwnProperty(header) ? payload[header] : rowInfo.rowData[index];
  });
  
  sheet.getRange(rowInfo.rowIndex, 1, 1, newRowData.length).setValues([newRowData]);
  return { status: 'success', message: 'Financing record updated successfully.' };
}

function handleDeleteFinancingRecord(payload) {
    return genericDelete(SHEET_NAMES.financingLedger, payload, 'finance_id');
}


// --- ACCOUNTS MODULE ---
function handleAddAccount(payload) {
  const sheet = getSheet(SHEET_NAMES.accounts);
  const newId = "acc-" + Math.random().toString(36).slice(2, 11);
  let fileUrl = '';

  if (payload.file) {
      fileUrl = uploadAccountFileToDrive(payload.locationName, payload.accountType, newId, payload.file);
  }
  
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const headerMap = getHeaderToFieldMap(headers);

  const newRow = headers.map(function(header) {
    const key = headerMap[header.trim()];
    if (key === 'accountID') return newId;
    if (key === 'timestamp') return new Date();
    if (key === 'fileUpload') return fileUrl;
    return payload[key] || '';
  });

  sheet.appendRow(newRow);
  return { status: 'success', message: 'Account added successfully.' };
}
function handleUpdateAccount(payload) {
  const sheet = getSheet(SHEET_NAMES.accounts);
  const rowInfo = findRowById(sheet, payload.accountID, 'AccountID');

  if (rowInfo) {
    let fileUrl = null;
    if (payload.file) {
        fileUrl = uploadAccountFileToDrive(payload.locationName, payload.accountType, payload.accountID, payload.file);
    }

    const headers = rowInfo.headers;
    const existingData = rowInfo.rowData;
    const headerMap = getHeaderToFieldMap(headers);

    const newRowData = headers.map(function(header, index) {
      const key = headerMap[header.trim()];

      if (key === 'timestamp') return new Date();
      if (key === 'accountID') return payload.accountID;
      if (key === 'fileUpload' && fileUrl !== null) {
        return fileUrl;
      }
      
      if (payload.hasOwnProperty(key)) {
        return payload[key];
      }
      
      return existingData[index];
    });
    
    sheet.getRange(rowInfo.rowIndex, 1, 1, newRowData.length).setValues([newRowData]);
    return { status: 'success', message: 'Account updated successfully.' };
  }
  
  throw new Error("Account ID not found for update: " + payload.accountID);
}
function handleDeleteAccount(payload) {
  const sheet = getSheet(SHEET_NAMES.accounts);
  const rowInfo = findRowById(sheet, payload.accountID, 'AccountID');
  
  if (rowInfo) {
    sheet.deleteRow(rowInfo.rowIndex);
    return { status: 'success', message: 'Account deleted successfully.' };
  }
  
  throw new Error("Account ID not found for deletion: " + payload.accountID);
}

// --- TASKS MODULE ---
function handleAddTask(payload) { return genericAdd(SHEET_NAMES.tasks, payload, 'task-', 'TaskID', null); }
function handleUpdateTask(payload) { return genericUpdate(SHEET_NAMES.tasks, payload, 'TaskID', null); }
function handleDeleteTask(payload) { return genericDelete(SHEET_NAMES.tasks, payload, 'TaskID'); }

// --- DIRECTORY MODULE ---
function handleAddContact(payload) { return genericAdd(SHEET_NAMES.directory, payload, 'con-', 'ContactID', 'Created On'); }
function handleUpdateContact(payload) { return genericUpdate(SHEET_NAMES.directory, payload, 'ContactID', 'Created On'); }
function handleDeleteContact(payload) { return genericDelete(SHEET_NAMES.directory, payload, 'ContactID'); }

// --- CUSTOMER SERVICE HUB MODULE ---

function createRecord(sheet, formType, formData, files) {
  const parentFolder = DriveApp.getFolderById(PARENT_DRIVE_FOLDER_ID);
  const ticketId = "TICKET-" + new Date().getTime();

  let uploadedFileUrls = {};
  if (files.length > 0) {
    uploadedFileUrls = uploadFilesToDrive(parentFolder, formData.fullName, ticketId, files);
  }
  
  const newRow = mapDataToSheetColumns(ticketId, formType, formData, uploadedFileUrls);
  sheet.appendRow(newRow);

  sendEmailConfirmation(formData, ticketId, uploadedFileUrls);

  return { status: "success", ticketId: ticketId };
}

function updateRecord(sheet, formData, files) {
  const ticketId = formData.ticketId;
  if (!ticketId) {
    throw new Error("Ticket ID is required for updating a record.");
  }
  const rowInfo = findRowById(sheet, ticketId, 'TicketID');
  if (!rowInfo) {
      throw new Error("Record with Ticket ID " + ticketId + " not found for update.");
  }
  let uploadedFileUrls = {};
  if (files.length > 0) {
    const parentFolder = DriveApp.getFolderById(PARENT_DRIVE_FOLDER_ID);
    uploadedFileUrls = uploadFilesToDrive(parentFolder, formData.fullName, ticketId, files);
  }
  const updatedRowData = mapDataToSheetColumns(ticketId, formData.formType, formData, uploadedFileUrls);
  const rowRange = sheet.getRange(rowInfo.rowIndex, 1, 1, rowInfo.headers.length);
  rowRange.setValues([updatedRowData]);
  return { status: "success", ticketId: ticketId, message: "Record updated successfully." };
}

function deleteRecord(sheet, ticketId) {
    const rowInfo = findRowById(sheet, ticketId, 'TicketID');
    if (rowInfo) {
        sheet.deleteRow(rowInfo.rowIndex);
        return ContentService
            .createTextOutput(JSON.stringify({ status: "success", ticketId: ticketId, message: "Record deleted successfully." }))
            .setMimeType(ContentService.MimeType.JSON);
    } else {
        return ContentService
            .createTextOutput(JSON.stringify({ status: "error", message: "Record not found for deletion." }))
            .setMimeType(ContentService.MimeType.JSON);
    }
}

function sendEmailConfirmation(formData, ticketId, uploadedFileUrls) {
    const [firstName = '', ...lastNameParts] = (formData.fullName || "").split(" ");
    const lastName = lastNameParts.join(" ");

    const emailData = {
        'TicketID': ticketId, 
        'Timestamp': new Date().toLocaleString(), 
        'Ticket Category': formData.formType || '',
        'Ticket Notes': formData.issueDescription || formData.ticketNotes || '', 
        'First Name': firstName,
        'Last Name': lastName, 
        'Email Address': formData.email || '',
        'Phone Number': formData.phoneNumber || '', 
        'Date of Transaction': formData.purchaseDate || '',
        'Receipt Number': formData.invoiceNumber || '', 
        'Purchase Amount': formData.purchaseAmount || '',
        'Last 4 Digits of Card': formData.last4Digits || '', 
        'Product': formData.product || '',
        'Store Name': formData.storeOfPurchase || formData.storeName || '', 
        'Status': formData.status || 'New', 
        'Office Notes': formData.officeNotes || '',
        'Receipt File': uploadedFileUrls.receipt || formData.receipt || 'N/A', 
        'File 1': uploadedFileUrls.file1 || formData.file1 ||'N/A',
        'File 2': uploadedFileUrls.file2 || formData.file2 || 'N/A', 
        'File 3': uploadedFileUrls.file3 || formData.file3 || 'N/A',
        'File 4': uploadedFileUrls.file4 || formData.file4 || 'N/A',
    };

    const templateDoc = DocumentApp.openById(EMAIL_DOC_TEMPLATE_ID);
    const tempDoc = DriveApp.getFileById(templateDoc.getId()).makeCopy('Temp Doc for ' + ticketId);
    const tempDocId = tempDoc.getId();
    const tempDocBody = DocumentApp.openById(tempDocId).getBody();
    
    Object.keys(emailData).forEach(key => {
        tempDocBody.replaceText(`\\[${key}\\]`, emailData[key] || '');
    });

    const populatedDoc = DocumentApp.openById(tempDocId);
    populatedDoc.saveAndClose();
    const pdfBlob = tempDoc.getBlob().getAs('application/pdf');
    const attachments = [pdfBlob];
    
    for (const fileKey in uploadedFileUrls) {
        if (uploadedFileUrls.hasOwnProperty(fileKey)) {
            try {
                const fileId = uploadedFileUrls[fileKey].split('/d/')[1].split('/')[0];
                attachments.push(DriveApp.getFileById(fileId).getBlob());
            } catch (e) {
                Logger.log("Error attaching file " + fileKey + ": " + e.message);
            }
        }
    }
    
    const recipient = emailData['Email Address'];
    const fullName = `${emailData['First Name']} ${emailData['Last Name']}`.trim();
    const customerSubject = `Customer Service Request for ${fullName} - ${emailData['TicketID']}`;
    const customerEmailBody = `Hello ${emailData['First Name']},\n\nThank you for reaching out! We've successfully received your customer service request.\n\nYour Ticket ID is: ${emailData['TicketID']}. Please keep this for your records.\n\nA PDF copy of your submission details is attached to this email. Please take a moment to review it for accuracy. Our team will review your request, and you can expect a response within 1-3 business days (excluding holidays).\n\nSincerely,\nThe Customer Service Team`;    
    if (recipient) {
        GmailApp.sendEmail(recipient, customerSubject, customerEmailBody, { attachments: attachments, name: "Customer Service" });
    }
    const officeSubject = `[NEW SUBMISSION] From ${fullName} - ${emailData['TicketID']}`;
    const officeEmailBody = "A new customer service request has been submitted. See attached PDF.";
    GmailApp.sendEmail(OFFICE_EMAIL, officeSubject, officeEmailBody, { attachments: attachments, name: "Customer Service Hub" });
    
    DriveApp.getFileById(tempDocId).setTrashed(true);
}

// --- UTILITY/HELPER FUNCTIONS ---

function getSheet(sheetName) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    const headers = {
      [SHEET_NAMES.customerService]: ["TicketID", "Ticket Category", "Ticket Notes", "First Name", "Last Name", "Email Address", "Phone Number", "Date of Transaction", "Receipt Number", "Purchase Amount", "Last 4 Digits of Card", "Product", "Store Name", "Receipt File", "Status", "Office Notes", "File 1", "File 2", "File 3", "File 4", "Timestamp"],
      [SHEET_NAMES.tasks]: ['TaskID', 'Task Name', 'Due Date', 'Task Description', 'Contact', 'Account', 'Status', 'Priority', 'Notes', 'Completed On'],
      [SHEET_NAMES.directory]: ['ContactID', 'First Name', 'Last Name', 'Phone Number', 'Email Address', 'Address', 'Company/Organization', 'Job Title', 'Department', 'Status', 'Notes', 'Created On'],
      [SHEET_NAMES.accounts]: ["AccountID", "Location Name", "Account Type", "Contact Person", "Phone", "Email", "Address", "Status", "Notes", "File Upload", "Timestamp"],
      [SHEET_NAMES.products]: ["Items", "Colors", "Category", "Sub-Category"],
      [SHEET_NAMES.financingLedger]: ['finance_id', 'customer_name', 'customer_email', 'customer_phone', 'product_description', 'receipt_number', 'sale_date', 'sales_rep', 'store_name', 'total_sale_amount', 'down_payment_amount', 'financed_amount', 'installment_count', 'installment_amount', 'payment_method', 'payment_due_day', 'total_amount_paid', 'current_balance_due', 'agreement_status', 'notes_log', 'agreement_file', 'id_card_file_url', 'receipt_file', 'created_on', 'last_updated'],
      [SHEET_NAMES.users]: ['UserID', 'Name', 'Email', 'Phone', 'AccessCode', 'Role', 'Location']
    };
    if (headers[sheetName]) {
      sheet.appendRow(headers[sheetName]);
    }
  }
  return sheet;
}

function findRowByHeaderValue(sheet, id, headerName) {
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const idColumnIndex = headers.indexOf(headerName);
    if (idColumnIndex === -1) {
        throw new Error(`Header "${headerName}" not found in sheet "${sheet.getName()}".`);
    }
    for (let i = 1; i < data.length; i++) {
        if (String(data[i][idColumnIndex]).trim() === String(id).trim()) {
            return { rowIndex: i + 1, rowData: data[i], headers: headers };
        }
    }
    return null;
}

function findRowById(sheet, id, idColumnName) {
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const idColumnIndex = headers.indexOf(idColumnName);
  if (idColumnIndex === -1) {
    return null;
  }
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][idColumnIndex]).trim() === String(id).trim()) {
      return { rowIndex: i + 1, rowData: data[i], headers: headers };
    }
  }
  return null;
}

function getHeaderToFieldMap(headers) {
  const map = {};
  headers.forEach(function(header) {
    if (!header) return;
    const cleanHeader = String(header).trim();
    const camelCaseKey = cleanHeader
      .replace(/[^a-zA-Z0-9\s]/g, '')
      .replace(/^\w/, c => c.toLowerCase())
      .replace(/\s+(.)/g, function(match, chr) {
        return chr.toUpperCase();
      });
    map[cleanHeader] = camelCaseKey;
  });
  return map;
}

function uploadAccountFileToDrive(locationName, accountType, accountId, file) {
  if (!file) return null;
  const parentFolder = DriveApp.getFolderById(ACCOUNTS_DRIVE_FOLDER_ID);
  
  const folderName = `(${locationName || 'No Location'}.${accountType || 'No Type'})`;
  const sanitizedFolderName = folderName.replace(/[\\/:"*?<>|]/g, '_').trim();

  const subFolders = parentFolder.getFoldersByName(sanitizedFolderName);
  const subFolder = subFolders.hasNext() ? subFolders.next() : parentFolder.createFolder(sanitizedFolderName);

  const filename = `${accountId}-${new Date().getTime()}-${file.filename}`;

  const decodedData = Utilities.base64Decode(file.data);
  const blob = Utilities.newBlob(decodedData, file.mimeType, filename);
  const savedFile = subFolder.createFile(blob);

  return savedFile.getUrl();
}

function uploadFilesToDrive(parentFolder, clientName, ticketId, files) {
  if (!files || files.length === 0) return {};
  const [firstName] = (clientName || "Unknown").split(" ");
  const clientFolderName = `${firstName} - ${ticketId}`;
  const existingFolders = parentFolder.getFoldersByName(clientFolderName);
  const clientFolder = existingFolders.hasNext() ? existingFolders.next() : parentFolder.createFolder(clientFolderName);
  const fileUrls = {};
  files.forEach((file) => {
    const decodedData = Utilities.base64Decode(file.data);
    const blob = Utilities.newBlob(decodedData, file.mimeType, file.filename);
    const savedFile = clientFolder.createFile(blob);
    savedFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    fileUrls[file.key] = savedFile.getUrl();
  });
  return fileUrls;
}

function mapDataToSheetColumns(ticketId, formType, data, fileUrls) {
  data = data || {};
  const [firstName = '', ...lastNameParts] = (data.fullName || "").split(" ");
  const lastName = lastNameParts.join(" ");

  return [
    ticketId,
    data.formType,
    data.issueDescription || "",
    firstName,
    lastName,
    data.email || "",
    data.phoneNumber || "",
    data.purchaseDate || "",
    data.invoiceNumber || "",
    data.purchaseAmount || "",
    data.last4Digits || "",
    data.product || "",
    data.storeOfPurchase || "",
    fileUrls.receipt || data.receipt || "",
    data.status || "New",
    data.officeNotes || "",
    fileUrls.file1 || data.file1 || "",
    fileUrls.file2 || data.file2 || "",
    fileUrls.file3 || data.file3 || "",
    fileUrls.file4 || data.file4 || "",
    data.Timestamp || new Date().toLocaleString(),
  ];
}