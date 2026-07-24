/**
 * CallIQ — CRM Portal Connector
 *
 * Connects to your company's customer portal API to:
 *   1. Fetch the full customer list
 *   2. Match each call record to a customer by phone / customer ID / account number
 *   3. Pull customer details (name, balance, product) into the scorecard
 *
 * Supports: Generic REST API, Salesforce, Zendesk, and custom formats.
 * Configure via environment variables or the /api/portal/config endpoint.
 */

const axios = require('axios');

// ─────────────────────────────────────────
//  In-memory config (overridden by /api/portal/config)
// ─────────────────────────────────────────
let portalConfig = {
  baseUrl:      process.env.CRM_BASE_URL     || '',
  apiKey:       process.env.CRM_API_KEY      || '',
  matchField:   process.env.CRM_MATCH_FIELD  || 'phone',
  fieldMap: {
    name:    process.env.CRM_FIELD_NAME    || 'customer.full_name',
    id:      process.env.CRM_FIELD_ID      || 'customer.id',
    phone:   process.env.CRM_FIELD_PHONE   || 'customer.phone_primary',
    balance: process.env.CRM_FIELD_BALANCE || 'account.balance_kes',
    product: process.env.CRM_FIELD_PRODUCT || 'product.name',
    agent:   process.env.CRM_FIELD_AGENT   || 'agent.employee_id'
  }
};

// ─────────────────────────────────────────
//  Build the axios client with auth headers
// ─────────────────────────────────────────
function buildClient() {
  if (!portalConfig.baseUrl) throw new Error('CRM_BASE_URL is not configured.');
  return axios.create({
    baseURL: portalConfig.baseUrl,
    headers: {
      'Authorization': portalConfig.apiKey,
      'Content-Type':  'application/json',
      'Accept':        'application/json'
    },
    timeout: 10000
  });
}

// ─────────────────────────────────────────
//  Fetch all customers from the portal
//  Handles pagination automatically (page/limit pattern)
// ─────────────────────────────────────────
async function fetchAllCustomers() {
  const client = buildClient();
  let customers = [];
  let page = 1;
  const limit = 100;

  while (true) {
    const res = await client.get('/customers', { params: { page, limit } });
    const data = res.data;

    // Support common response shapes: array, { data: [] }, { customers: [] }, { results: [] }
    const records = Array.isArray(data)
      ? data
      : data.data || data.customers || data.results || [];

    if (!records.length) break;

    customers = customers.concat(records.map(r => normaliseRecord(r)));
    if (records.length < limit) break;
    page++;
  }

  return customers;
}

// ─────────────────────────────────────────
//  Fetch a single customer by their identifier
// ─────────────────────────────────────────
async function fetchCustomerById(customerId) {
  const client = buildClient();
  const res = await client.get(`/customers/${customerId}`);
  return normaliseRecord(res.data);
}

// ─────────────────────────────────────────
//  Match an array of call records to CRM customers
//  callRecords: [{ custId, phone, ... }]
//  crmCustomers: already-fetched array from fetchAllCustomers()
//  Returns the call records enriched with CRM data
// ─────────────────────────────────────────
function matchCallsToCRM(callRecords, crmCustomers) {
  const byId    = new Map(crmCustomers.map(c => [c.id,    c]));
  const byPhone = new Map(crmCustomers.map(c => [c.phone, c]));
  const byAcct  = new Map(crmCustomers.map(c => [c.accountNumber, c]));

  return callRecords.map(call => {
    let matched = null;

    switch (portalConfig.matchField) {
      case 'phone':   matched = byPhone.get(call.phone)   || byId.get(call.custId);   break;
      case 'custid':  matched = byId.get(call.custId)     || byPhone.get(call.phone); break;
      case 'account': matched = byAcct.get(call.accountNumber) || byId.get(call.custId); break;
      default:        matched = byId.get(call.custId);
    }

    return {
      ...call,
      crmMatched:  !!matched,
      customerName: matched?.name    || call.customer || 'Unknown',
      custId:       matched?.id      || call.custId   || '',
      balance:      matched?.balance || '',
      product:      matched?.product || '',
      agentId:      matched?.agentId || ''
    };
  });
}

// ─────────────────────────────────────────
//  Test the portal connection
//  Returns { ok, latencyMs, customerCount }
// ─────────────────────────────────────────
async function testConnection() {
  const start = Date.now();
  try {
    const client = buildClient();
    const res = await client.get('/customers', { params: { page: 1, limit: 1 } });
    const data = res.data;
    const records = Array.isArray(data) ? data : data.data || data.customers || data.results || [];
    const total = data.total || data.count || records.length;
    return { ok: true, latencyMs: Date.now() - start, customerCount: total };
  } catch (err) {
    return { ok: false, latencyMs: Date.now() - start, error: err.message };
  }
}

// ─────────────────────────────────────────
//  Normalise a raw CRM record using the field map
// ─────────────────────────────────────────
function normaliseRecord(raw) {
  const fm = portalConfig.fieldMap;
  return {
    id:            getNestedValue(raw, fm.id)      || raw.id || raw._id || '',
    name:          getNestedValue(raw, fm.name)    || raw.name || raw.full_name || '',
    phone:         getNestedValue(raw, fm.phone)   || raw.phone || raw.msisdn || '',
    balance:       getNestedValue(raw, fm.balance) || raw.balance || '',
    product:       getNestedValue(raw, fm.product) || raw.product || '',
    agentId:       getNestedValue(raw, fm.agent)   || raw.agent_id || '',
    accountNumber: raw.account_number || raw.accountNumber || ''
  };
}

// Safely read a dot-notation path from an object (e.g. "customer.full_name")
function getNestedValue(obj, path) {
  if (!path || !obj) return undefined;
  return path.split('.').reduce((o, k) => (o && o[k] !== undefined ? o[k] : undefined), obj);
}

// ─────────────────────────────────────────
//  Config management
// ─────────────────────────────────────────
function getConfig()       { return { ...portalConfig, apiKey: '***' }; }
function setConfig(config) { portalConfig = { ...portalConfig, ...config }; }

module.exports = {
  fetchAllCustomers,
  fetchCustomerById,
  matchCallsToCRM,
  testConnection,
  getConfig,
  setConfig
};
