import axios from 'axios';
import crypto from 'crypto';
import { getOAuthRedirectUri } from '../utils/oauthConfig.js';

class QuickBooksService {
  constructor() {
    this.clientId = process.env.QB_CLIENT_ID;
    this.clientSecret = process.env.QB_CLIENT_SECRET;
    this.environment = process.env.QB_ENVIRONMENT || 'sandbox';

    this.baseUrl = this.environment === 'production'
      ? 'https://quickbooks.api.intuit.com'
      : 'https://sandbox-quickbooks.api.intuit.com';

    this.authUrl = 'https://appcenter.intuit.com/connect/oauth2';
    this.tokenUrl = 'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer';
    this.revokeUrl = 'https://developer.api.intuit.com/v2/oauth2/tokens/revoke';
  }

  // Get redirect URI (uses production for mobile compatibility)
  getRedirectUri() {
    return getOAuthRedirectUri('quickbooks');
  }

  // Generate OAuth authorization URL
  getAuthorizationUrl(state) {
    const scopes = [
      'com.intuit.quickbooks.accounting',
      'openid',
      'profile',
      'email'
    ].join(' ');

    const redirectUri = this.getRedirectUri();

    const params = new URLSearchParams({
      client_id: this.clientId,
      scope: scopes,
      redirect_uri: redirectUri,
      response_type: 'code',
      state: state
    });

    return `${this.authUrl}?${params.toString()}`;
  }

  // Exchange authorization code for tokens
  async getTokens(code) {
    const auth = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');
    const redirectUri = this.getRedirectUri();

    const response = await axios.post(
      this.tokenUrl,
      new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: redirectUri
      }),
      {
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    return response.data;
  }

  // Refresh access token
  async refreshToken(refreshToken) {
    const auth = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');

    const response = await axios.post(
      this.tokenUrl,
      new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken
      }),
      {
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    return response.data;
  }

  // Revoke token (disconnect)
  async revokeToken(refreshToken) {
    const auth = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');

    await axios.post(
      this.revokeUrl,
      new URLSearchParams({
        token: refreshToken
      }),
      {
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );
  }

  // Make authenticated API request
  async makeRequest(method, endpoint, realmId, accessToken, data = null) {
    const url = `${this.baseUrl}/v3/company/${realmId}${endpoint}`;

    const config = {
      method,
      url,
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    };

    if (data) {
      config.data = data;
    }

    const response = await axios(config);
    return response.data;
  }

  // ==== CUSTOMER OPERATIONS ====

  async createCustomer(realmId, accessToken, customerData) {
    const qbCustomer = {
      DisplayName: customerData.name,
      PrimaryEmailAddr: customerData.email ? { Address: customerData.email } : undefined,
      PrimaryPhone: customerData.phone ? { FreeFormNumber: customerData.phone } : undefined,
      CompanyName: customerData.company || undefined,
      BillAddr: customerData.address ? {
        Line1: customerData.address.street,
        City: customerData.address.city,
        CountrySubDivisionCode: customerData.address.state,
        PostalCode: customerData.address.zip,
        Country: customerData.address.country || 'USA'
      } : undefined
    };

    return this.makeRequest('POST', '/customer', realmId, accessToken, qbCustomer);
  }

  async getCustomer(realmId, accessToken, customerId) {
    return this.makeRequest('GET', `/customer/${customerId}`, realmId, accessToken);
  }

  async queryCustomers(realmId, accessToken, query = 'SELECT * FROM Customer') {
    const endpoint = `/query?query=${encodeURIComponent(query)}`;
    return this.makeRequest('GET', endpoint, realmId, accessToken);
  }

  // ==== INVOICE OPERATIONS ====

  async createInvoice(realmId, accessToken, invoiceData) {
    const qbInvoice = {
      CustomerRef: { value: invoiceData.qbCustomerId },
      Line: invoiceData.items.map(item => ({
        Amount: item.amount,
        DetailType: 'SalesItemLineDetail',
        Description: item.description,
        SalesItemLineDetail: {
          Qty: item.quantity,
          UnitPrice: item.rate,
          TaxCodeRef: item.taxable ? { value: 'TAX' } : { value: 'NON' }
        }
      })),
      TxnDate: invoiceData.issueDate,
      DueDate: invoiceData.dueDate,
      CustomerMemo: invoiceData.notes ? { value: invoiceData.notes } : undefined,
      TxnTaxDetail: invoiceData.taxRate > 0 ? {
        TotalTax: invoiceData.taxAmount
      } : undefined,
      DiscountAmt: invoiceData.discount || undefined
    };

    return this.makeRequest('POST', '/invoice', realmId, accessToken, qbInvoice);
  }

  async getInvoice(realmId, accessToken, invoiceId) {
    return this.makeRequest('GET', `/invoice/${invoiceId}`, realmId, accessToken);
  }

  async updateInvoice(realmId, accessToken, invoiceId, invoiceData, syncToken) {
    const qbInvoice = {
      ...invoiceData,
      Id: invoiceId,
      SyncToken: syncToken,
      sparse: true  // Only update provided fields
    };

    return this.makeRequest('POST', '/invoice?operation=update', realmId, accessToken, qbInvoice);
  }

  async deleteInvoice(realmId, accessToken, invoiceId, syncToken) {
    return this.makeRequest('POST', '/invoice?operation=delete', realmId, accessToken, {
      Id: invoiceId,
      SyncToken: syncToken
    });
  }

  // ==== ESTIMATE OPERATIONS ====

  async createEstimate(realmId, accessToken, estimateData) {
    const qbEstimate = {
      CustomerRef: { value: estimateData.qbCustomerId },
      Line: estimateData.items.map(item => ({
        Amount: item.amount,
        DetailType: 'SalesItemLineDetail',
        Description: item.description,
        SalesItemLineDetail: {
          Qty: item.quantity,
          UnitPrice: item.rate
        }
      })),
      TxnDate: estimateData.issueDate,
      ExpirationDate: estimateData.validUntil,
      CustomerMemo: estimateData.notes ? { value: estimateData.notes } : undefined
    };

    return this.makeRequest('POST', '/estimate', realmId, accessToken, qbEstimate);
  }

  async getEstimate(realmId, accessToken, estimateId) {
    return this.makeRequest('GET', `/estimate/${estimateId}`, realmId, accessToken);
  }

  // ==== PAYMENT OPERATIONS ====

  async createPayment(realmId, accessToken, paymentData) {
    const qbPayment = {
      CustomerRef: { value: paymentData.qbCustomerId },
      TotalAmt: paymentData.amount,
      TxnDate: paymentData.date,
      Line: [
        {
          Amount: paymentData.amount,
          LinkedTxn: [
            {
              TxnId: paymentData.qbInvoiceId,
              TxnType: 'Invoice'
            }
          ]
        }
      ]
    };

    return this.makeRequest('POST', '/payment', realmId, accessToken, qbPayment);
  }

  // ==== WEBHOOK VERIFICATION ====

  verifyWebhookSignature(payload, signature, webhookToken) {
    const hash = crypto
      .createHmac('sha256', webhookToken)
      .update(payload)
      .digest('base64');

    return hash === signature;
  }

  // ==== HELPER FUNCTIONS ====

  // Map CRM customer to QB format
  mapCustomerToQB(customer) {
    return {
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      company: customer.company,
      address: customer.address
    };
  }

  // Map CRM invoice to QB format
  mapInvoiceToQB(invoice, qbCustomerId) {
    return {
      qbCustomerId,
      items: invoice.items,
      issueDate: invoice.issueDate,
      dueDate: invoice.dueDate,
      notes: invoice.notes,
      taxRate: invoice.taxRate,
      taxAmount: invoice.taxAmount,
      discount: invoice.discount
    };
  }

  // Map QB invoice to CRM format
  mapQBInvoiceToCRM(qbInvoice) {
    return {
      invoiceNumber: qbInvoice.DocNumber,
      quickbooksId: qbInvoice.Id,
      syncToken: qbInvoice.SyncToken,
      client: {
        name: qbInvoice.CustomerRef.name
      },
      items: qbInvoice.Line.map(line => ({
        description: line.Description,
        quantity: line.SalesItemLineDetail?.Qty || 1,
        rate: line.SalesItemLineDetail?.UnitPrice || 0,
        amount: line.Amount
      })),
      subtotal: qbInvoice.TxnTaxDetail?.TotalTax ? qbInvoice.TotalAmt - qbInvoice.TxnTaxDetail.TotalTax : qbInvoice.TotalAmt,
      total: qbInvoice.TotalAmt,
      balance: qbInvoice.Balance,
      issueDate: qbInvoice.TxnDate,
      dueDate: qbInvoice.DueDate,
      status: qbInvoice.Balance === 0 ? 'paid' : qbInvoice.Balance < qbInvoice.TotalAmt ? 'partial' : 'sent'
    };
  }
}

export default new QuickBooksService();
