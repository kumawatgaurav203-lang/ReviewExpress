import fs from 'fs';
import path from 'path';

export interface OwnerAccount {
  id: string;
  email: string;
  password: string; // Exactly 8 characters
  businessName: string;
  businessSlug: string;
  category?: string;
  googleReviewLink: string;
  createdAt: string;
}

const dataFilePath = path.join(process.cwd(), 'data', 'accounts.json');

// Read from JSON file
function readAccountsFromFile(): OwnerAccount[] {
  try {
    if (fs.existsSync(dataFilePath)) {
      const content = fs.readFileSync(dataFilePath, 'utf8');
      return JSON.parse(content);
    }
  } catch (err) {
    console.error('Failed to read accounts file:', err);
  }
  return [];
}

// Write to JSON file
function writeAccountsToFile(accounts: OwnerAccount[]) {
  try {
    const dir = path.dirname(dataFilePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(dataFilePath, JSON.stringify(accounts, null, 2), 'utf8');
  } catch (err) {
    console.error('Failed to write accounts file:', err);
  }
}

// In-memory cache
let accountsCache: OwnerAccount[] = readAccountsFromFile();

export function saveOwnerAccount(account: Omit<OwnerAccount, 'id' | 'createdAt'>): OwnerAccount {
  accountsCache = readAccountsFromFile();
  
  const existingIdx = accountsCache.findIndex(
    (a) => a.email.toLowerCase() === account.email.toLowerCase()
  );

  const newAccount: OwnerAccount = {
    id: 'acc-' + Date.now(),
    ...account,
    email: account.email.toLowerCase().trim(),
    createdAt: new Date().toISOString(),
  };

  if (existingIdx >= 0) {
    accountsCache[existingIdx] = newAccount;
  } else {
    accountsCache.unshift(newAccount);
  }

  writeAccountsToFile(accountsCache);
  return newAccount;
}

export function getAllOwnerAccounts(): OwnerAccount[] {
  accountsCache = readAccountsFromFile();
  return accountsCache;
}

export function getOwnerAccountByEmail(email: string): OwnerAccount | undefined {
  accountsCache = readAccountsFromFile();
  return accountsCache.find((a) => a.email.toLowerCase() === email.toLowerCase().trim());
}

export function verifyOwnerLogin(email: string, password: string): { success: boolean; account?: OwnerAccount; message?: string } {
  accountsCache = readAccountsFromFile();
  const cleanEmail = email.toLowerCase().trim();
  const account = accountsCache.find((a) => a.email.toLowerCase() === cleanEmail);

  if (!account) {
    return { success: false, message: 'Account not found. Please create an account in the Agency Onboarding Panel first.' };
  }

  if (account.password !== password) {
    return { success: false, message: 'Incorrect 8-character password. Please check and try again.' };
  }

  return { success: true, account };
}

export function getAccountBySlug(slug: string): OwnerAccount | undefined {
  accountsCache = readAccountsFromFile();
  return accountsCache.find((a) => a.businessSlug === slug);
}

export function updateOwnerPassword(email: string, newPassword: string): boolean {
  accountsCache = readAccountsFromFile();
  const existingIdx = accountsCache.findIndex(
    (a) => a.email.toLowerCase() === email.toLowerCase().trim()
  );

  if (existingIdx >= 0) {
    accountsCache[existingIdx].password = newPassword;
    writeAccountsToFile(accountsCache);
    return true;
  }
  return false;
}

export function deleteOwnerAccount(email: string): boolean {
  accountsCache = readAccountsFromFile();
  const initialLength = accountsCache.length;
  accountsCache = accountsCache.filter(
    (a) => a.email.toLowerCase() !== email.toLowerCase().trim()
  );
  if (accountsCache.length < initialLength) {
    writeAccountsToFile(accountsCache);
    return true;
  }
  return false;
}
