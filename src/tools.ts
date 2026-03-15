import { z } from 'zod';
import { LightsparkClient } from './api-client.js';

/**
 * Lightspark SDK MCP Tool Definitions
 * 37 tools covering: Account, Fees, Invoices, Payments, Wallets, Channels, UMA, Compliance, Test Mode
 */

export const tools = [

  // ===== Account =====

  {
    name: 'get_current_account',
    description: 'Get connected Lightspark account with nodes, balances, and API tokens',
    inputSchema: z.object({}),
    handler: async (client: LightsparkClient) => {
      return await client.getCurrentAccount();
    },
  },

  {
    name: 'get_entity',
    description: 'Get any entity by ID (payment, invoice, node, channel, etc)',
    inputSchema: z.object({
      id: z.string().describe('Entity ID'),
    }),
    handler: async (client: LightsparkClient, args: any) => {
      return await client.getEntity(args.id);
    },
  },

  // ===== Fee Estimates =====

  {
    name: 'get_bitcoin_fee_estimate',
    description: 'Get L1 Bitcoin transaction fee estimates (fast vs minimum)',
    inputSchema: z.object({
      network: z.enum(['MAINNET', 'REGTEST', 'SIGNET', 'TESTNET']).describe('Bitcoin network'),
    }),
    handler: async (client: LightsparkClient, args: any) => {
      return await client.getBitcoinFeeEstimate(args.network);
    },
  },

  {
    name: 'get_lightning_fee_estimate_for_invoice',
    description: 'Estimate Lightning fees for paying a BOLT11 invoice',
    inputSchema: z.object({
      node_id: z.string().describe('Sending node ID'),
      encoded_payment_request: z.string().describe('BOLT11 invoice'),
      amount_msats: z.number().optional().describe('Amount in msats'),
    }),
    handler: async (client: LightsparkClient, args: any) => {
      return await client.getLightningFeeEstimateForInvoice(args.node_id, args.encoded_payment_request, args.amount_msats);
    },
  },

  {
    name: 'get_lightning_fee_estimate_for_node',
    description: 'Estimate Lightning fees for sending to a node by public key',
    inputSchema: z.object({
      node_id: z.string().describe('Sending node ID'),
      destination_public_key: z.string().describe('Destination pubkey'),
      amount_msats: z.number().describe('Amount in msats'),
    }),
    handler: async (client: LightsparkClient, args: any) => {
      return await client.getLightningFeeEstimateForNode(args.node_id, args.destination_public_key, args.amount_msats);
    },
  },

  {
    name: 'get_withdrawal_fee_estimate',
    description: 'Estimate fees for withdrawing funds to a Bitcoin address',
    inputSchema: z.object({
      node_id: z.string().describe('Node ID'),
      amount_sats: z.number().describe('Amount in sats (-1 for all)'),
      withdrawal_mode: z.enum(['WALLET_ONLY', 'WALLET_THEN_CHANNELS']).describe('Withdrawal mode'),
    }),
    handler: async (client: LightsparkClient, args: any) => {
      return await client.getWithdrawalFeeEstimate(args.node_id, args.amount_sats, args.withdrawal_mode);
    },
  },

  // ===== Invoice & Payment Lookups =====

  {
    name: 'decode_payment_request',
    description: 'Decode a BOLT11 invoice or BOLT12 offer into structured data',
    inputSchema: z.object({
      encoded_payment_request: z.string().describe('BOLT11/12 string'),
    }),
    handler: async (client: LightsparkClient, args: any) => {
      return await client.decodePaymentRequest(args.encoded_payment_request);
    },
  },

  {
    name: 'get_incoming_payments_for_invoice',
    description: 'Get incoming payments for an invoice',
    inputSchema: z.object({
      invoice_id: z.string().describe('Invoice ID'),
      statuses: z.array(z.enum(['SUCCESS', 'FAILED', 'PENDING'])).optional().describe('Filter statuses'),
    }),
    handler: async (client: LightsparkClient, args: any) => {
      return await client.getIncomingPaymentsForInvoice(args.invoice_id, args.statuses);
    },
  },

  {
    name: 'get_incoming_payments_for_payment_hash',
    description: 'Get incoming payments by payment hash',
    inputSchema: z.object({
      payment_hash: z.string().describe('32-byte payment hash'),
      statuses: z.array(z.enum(['SUCCESS', 'FAILED', 'PENDING'])).optional().describe('Filter statuses'),
    }),
    handler: async (client: LightsparkClient, args: any) => {
      return await client.getIncomingPaymentsForPaymentHash(args.payment_hash, args.statuses);
    },
  },

  {
    name: 'get_invoice_for_payment_hash',
    description: 'Look up an invoice by its payment hash',
    inputSchema: z.object({
      payment_hash: z.string().describe('Payment hash'),
    }),
    handler: async (client: LightsparkClient, args: any) => {
      return await client.getInvoiceForPaymentHash(args.payment_hash);
    },
  },

  {
    name: 'get_outgoing_payment_by_idempotency_key',
    description: 'Get outgoing payment by its idempotency key',
    inputSchema: z.object({
      idempotency_key: z.string().describe('Idempotency key'),
    }),
    handler: async (client: LightsparkClient, args: any) => {
      return await client.getOutgoingPaymentByIdempotencyKey(args.idempotency_key);
    },
  },

  {
    name: 'get_outgoing_payments_for_invoice',
    description: 'Get outgoing payments that paid a given invoice',
    inputSchema: z.object({
      encoded_invoice: z.string().describe('BOLT11 invoice'),
      statuses: z.array(z.enum(['SUCCESS', 'FAILED', 'PENDING'])).optional().describe('Filter statuses'),
    }),
    handler: async (client: LightsparkClient, args: any) => {
      return await client.getOutgoingPaymentsForInvoice(args.encoded_invoice, args.statuses);
    },
  },

  {
    name: 'get_outgoing_payments_for_payment_hash',
    description: 'Get outgoing payments by payment hash',
    inputSchema: z.object({
      payment_hash: z.string().describe('Payment hash'),
      statuses: z.array(z.enum(['SUCCESS', 'FAILED', 'PENDING'])).optional().describe('Filter statuses'),
    }),
    handler: async (client: LightsparkClient, args: any) => {
      return await client.getOutgoingPaymentsForPaymentHash(args.payment_hash, args.statuses);
    },
  },

  // ===== Invoice & Offer Creation =====

  {
    name: 'create_invoice',
    description: 'Create a BOLT11 Lightning invoice (amount=0 for any-amount)',
    inputSchema: z.object({
      node_id: z.string().describe('Node ID'),
      amount_msats: z.number().describe('Amount in msats (0=any)'),
      memo: z.string().optional().describe('Invoice memo'),
      invoice_type: z.enum(['STANDARD', 'AMP']).optional().describe('Invoice type'),
      expiry_secs: z.number().optional().describe('Expiry seconds'),
    }),
    handler: async (client: LightsparkClient, args: any) => {
      return await client.createInvoice(args.node_id, args.amount_msats, args.memo, args.invoice_type, args.expiry_secs);
    },
  },

  {
    name: 'create_offer',
    description: 'Create a reusable BOLT12 offer',
    inputSchema: z.object({
      node_id: z.string().describe('Node ID'),
      amount_msats: z.number().optional().describe('Fixed amount msats'),
      description: z.string().optional().describe('Offer description'),
    }),
    handler: async (client: LightsparkClient, args: any) => {
      return await client.createOffer(args.node_id, args.amount_msats, args.description);
    },
  },

  {
    name: 'create_lnurl_invoice',
    description: 'Create an LNURL-specific invoice with metadata hash',
    inputSchema: z.object({
      node_id: z.string().describe('Node ID'),
      amount_msats: z.number().describe('Amount in msats'),
      metadata_hash: z.string().describe('LNURL metadata hash'),
      expiry_secs: z.number().optional().describe('Expiry seconds'),
    }),
    handler: async (client: LightsparkClient, args: any) => {
      return await client.createLnurlInvoice(args.node_id, args.amount_msats, args.metadata_hash, args.expiry_secs);
    },
  },

  {
    name: 'create_uma_invoice',
    description: 'Create a UMA protocol invoice',
    inputSchema: z.object({
      node_id: z.string().describe('Node ID'),
      amount_msats: z.number().describe('Amount in msats'),
      metadata_hash: z.string().describe('UMA metadata hash'),
      expiry_secs: z.number().optional().describe('Expiry seconds'),
    }),
    handler: async (client: LightsparkClient, args: any) => {
      return await client.createUmaInvoice(args.node_id, args.amount_msats, args.metadata_hash, args.expiry_secs);
    },
  },

  {
    name: 'cancel_invoice',
    description: 'Cancel an open, unsettled, unexpired invoice',
    inputSchema: z.object({
      invoice_id: z.string().describe('Invoice ID'),
    }),
    handler: async (client: LightsparkClient, args: any) => {
      return await client.cancelInvoice(args.invoice_id);
    },
  },

  // ===== Payment Operations =====

  {
    name: 'pay_invoice',
    description: 'Pay a BOLT11 Lightning invoice',
    inputSchema: z.object({
      node_id: z.string().describe('Sending node ID'),
      encoded_invoice: z.string().describe('BOLT11 invoice'),
      timeout_secs: z.number().describe('Timeout seconds'),
      maximum_fees_msats: z.number().describe('Max fee in msats'),
      amount_msats: z.number().optional().describe('Amount for 0-amt'),
      idempotency_key: z.string().optional().describe('Idempotency key'),
    }),
    handler: async (client: LightsparkClient, args: any) => {
      return await client.payInvoice(args.node_id, args.encoded_invoice, args.timeout_secs, args.maximum_fees_msats, args.amount_msats, args.idempotency_key);
    },
  },

  {
    name: 'pay_offer',
    description: 'Pay a BOLT12 offer',
    inputSchema: z.object({
      node_id: z.string().describe('Sending node ID'),
      encoded_offer: z.string().describe('BOLT12 offer'),
      timeout_secs: z.number().describe('Timeout seconds'),
      maximum_fees_msats: z.number().describe('Max fee in msats'),
      amount_msats: z.number().optional().describe('Amount in msats'),
      idempotency_key: z.string().optional().describe('Idempotency key'),
    }),
    handler: async (client: LightsparkClient, args: any) => {
      return await client.payOffer(args.node_id, args.encoded_offer, args.timeout_secs, args.maximum_fees_msats, args.amount_msats, args.idempotency_key);
    },
  },

  {
    name: 'pay_uma_invoice',
    description: 'Pay a UMA protocol invoice',
    inputSchema: z.object({
      node_id: z.string().describe('Sending node ID'),
      encoded_invoice: z.string().describe('UMA invoice'),
      timeout_secs: z.number().describe('Timeout seconds'),
      maximum_fees_msats: z.number().describe('Max fee in msats'),
      amount_msats: z.number().optional().describe('Amount in msats'),
      sender_hash: z.string().optional().describe('Sender hash'),
    }),
    handler: async (client: LightsparkClient, args: any) => {
      return await client.payUmaInvoice(args.node_id, args.encoded_invoice, args.timeout_secs, args.maximum_fees_msats, args.amount_msats, args.sender_hash);
    },
  },

  {
    name: 'send_payment',
    description: 'Send payment to a node by public key (keysend, no invoice)',
    inputSchema: z.object({
      node_id: z.string().describe('Sending node ID'),
      destination_public_key: z.string().describe('Destination pubkey'),
      amount_msats: z.number().describe('Amount in msats'),
      timeout_secs: z.number().describe('Timeout seconds'),
      maximum_fees_msats: z.number().describe('Max fee in msats'),
      idempotency_key: z.string().optional().describe('Idempotency key'),
    }),
    handler: async (client: LightsparkClient, args: any) => {
      return await client.sendPayment(args.node_id, args.destination_public_key, args.amount_msats, args.timeout_secs, args.maximum_fees_msats, args.idempotency_key);
    },
  },

  // ===== Wallet & Node Operations =====

  {
    name: 'create_node_wallet_address',
    description: 'Generate a new Bitcoin deposit address for a node wallet',
    inputSchema: z.object({
      node_id: z.string().describe('Node ID'),
    }),
    handler: async (client: LightsparkClient, args: any) => {
      return await client.createNodeWalletAddress(args.node_id);
    },
  },

  {
    name: 'request_withdrawal',
    description: 'Withdraw funds to a Bitcoin address (-1 sats = all funds)',
    inputSchema: z.object({
      node_id: z.string().describe('Node ID'),
      bitcoin_address: z.string().describe('Destination address'),
      amount_sats: z.number().describe('Sats (-1 = all)'),
      withdrawal_mode: z.enum(['WALLET_ONLY', 'WALLET_THEN_CHANNELS']).describe('Mode'),
      idempotency_key: z.string().optional().describe('Idempotency key'),
      fee_target: z.enum(['HIGH', 'MEDIUM', 'LOW', 'BACKGROUND']).optional().describe('Fee target'),
    }),
    handler: async (client: LightsparkClient, args: any) => {
      return await client.requestWithdrawal(args.node_id, args.bitcoin_address, args.amount_sats, args.withdrawal_mode, args.idempotency_key, args.fee_target);
    },
  },

  {
    name: 'fund_node',
    description: 'Add test funds to a node (REGTEST only, default 10M sats)',
    inputSchema: z.object({
      node_id: z.string().describe('Node ID'),
      amount_sats: z.number().optional().describe('Amount in sats'),
    }),
    handler: async (client: LightsparkClient, args: any) => {
      return await client.fundNode(args.node_id, args.amount_sats);
    },
  },

  // ===== API Token Management =====

  {
    name: 'create_api_token',
    description: 'Create a new API token with specified permissions',
    inputSchema: z.object({
      name: z.string().describe('Token name'),
      permissions: z.array(z.enum([
        'ALL', 'MAINNET_VIEW', 'MAINNET_TRANSACT', 'MAINNET_MANAGE',
        'TESTNET_VIEW', 'TESTNET_TRANSACT', 'TESTNET_MANAGE',
        'REGTEST_VIEW', 'REGTEST_TRANSACT', 'REGTEST_MANAGE',
        'USER_VIEW', 'USER_MANAGE', 'ACCOUNT_VIEW', 'ACCOUNT_MANAGE',
      ])).describe('Permissions'),
    }),
    handler: async (client: LightsparkClient, args: any) => {
      return await client.createApiToken(args.name, args.permissions);
    },
  },

  {
    name: 'delete_api_token',
    description: 'Delete an API token',
    inputSchema: z.object({
      api_token_id: z.string().describe('Token ID'),
    }),
    handler: async (client: LightsparkClient, args: any) => {
      return await client.deleteApiToken(args.api_token_id);
    },
  },

  // ===== Compliance =====

  {
    name: 'screen_node',
    description: 'Screen a Lightning node for risk via Chainalysis',
    inputSchema: z.object({
      provider: z.enum(['CHAINALYSIS']).describe('Provider'),
      node_pubkey: z.string().describe('Node public key'),
    }),
    handler: async (client: LightsparkClient, args: any) => {
      return await client.screenNode(args.provider, args.node_pubkey);
    },
  },

  {
    name: 'register_payment',
    description: 'Register a payment with a compliance provider',
    inputSchema: z.object({
      provider: z.enum(['CHAINALYSIS']).describe('Provider'),
      payment_id: z.string().describe('Payment ID'),
      node_pubkey: z.string().describe('Node public key'),
      direction: z.enum(['SENT', 'RECEIVED']).describe('Direction'),
    }),
    handler: async (client: LightsparkClient, args: any) => {
      return await client.registerPayment(args.provider, args.payment_id, args.node_pubkey, args.direction);
    },
  },

  // ===== UMA Invitations =====

  {
    name: 'lookup_uma_address',
    description: 'Check if a UMA address exists',
    inputSchema: z.object({
      uma_address: z.string().describe('UMA address'),
    }),
    handler: async (client: LightsparkClient, args: any) => {
      return await client.lookupUmaAddress(args.uma_address);
    },
  },

  {
    name: 'get_uma_invitation_by_code',
    description: 'Get a UMA.ME invitation by code',
    inputSchema: z.object({
      code: z.string().describe('Invitation code'),
    }),
    handler: async (client: LightsparkClient, args: any) => {
      return await client.getUmaInvitationByCode(args.code);
    },
  },

  {
    name: 'create_uma_invitation',
    description: 'Create a UMA.ME invitation',
    inputSchema: z.object({
      inviter_uma: z.string().describe('Inviter UMA address'),
      inviter_first_name: z.string().optional().describe('Inviter name'),
    }),
    handler: async (client: LightsparkClient, args: any) => {
      return await client.createUmaInvitation(args.inviter_uma, args.inviter_first_name);
    },
  },

  {
    name: 'claim_uma_invitation',
    description: 'Claim a UMA.ME invitation',
    inputSchema: z.object({
      invitation_code: z.string().describe('Invitation code'),
      invitee_uma: z.string().describe('Invitee UMA address'),
    }),
    handler: async (client: LightsparkClient, args: any) => {
      return await client.claimUmaInvitation(args.invitation_code, args.invitee_uma);
    },
  },

  {
    name: 'cancel_uma_invitation',
    description: 'Cancel a UMA.ME invitation',
    inputSchema: z.object({
      invite_code: z.string().describe('Invitation code'),
    }),
    handler: async (client: LightsparkClient, args: any) => {
      return await client.cancelUmaInvitation(args.invite_code);
    },
  },

  // ===== Test Mode (REGTEST) =====

  {
    name: 'create_test_mode_invoice',
    description: 'Create a test invoice payable by your node (REGTEST only)',
    inputSchema: z.object({
      local_node_id: z.string().describe('Node ID'),
      amount_msats: z.number().describe('Amount in msats'),
      memo: z.string().optional().describe('Invoice memo'),
      invoice_type: z.enum(['STANDARD', 'AMP']).optional().describe('Invoice type'),
    }),
    handler: async (client: LightsparkClient, args: any) => {
      return await client.createTestModeInvoice(args.local_node_id, args.amount_msats, args.memo, args.invoice_type);
    },
  },

  {
    name: 'create_test_mode_payment',
    description: 'Simulate sending a payment to your node (REGTEST only)',
    inputSchema: z.object({
      local_node_id: z.string().describe('Node ID'),
      encoded_invoice: z.string().describe('Invoice to pay'),
      amount_msats: z.number().optional().describe('Amount in msats'),
    }),
    handler: async (client: LightsparkClient, args: any) => {
      return await client.createTestModePayment(args.local_node_id, args.encoded_invoice, args.amount_msats);
    },
  },

  {
    name: 'pay_test_mode_invoice',
    description: 'Simulate payment with optional failure reason (REGTEST)',
    inputSchema: z.object({
      node_id: z.string().describe('Node ID'),
      encoded_invoice: z.string().describe('Invoice to pay'),
      timeout_secs: z.number().describe('Timeout seconds'),
      maximum_fees_msats: z.number().describe('Max fee msats'),
      failure_reason: z.enum([
        'NONE', 'TIMEOUT', 'NO_ROUTE', 'ERROR',
        'INCORRECT_PAYMENT_DETAILS', 'INSUFFICIENT_BALANCE',
        'INVOICE_ALREADY_PAID', 'SELF_PAYMENT', 'INVOICE_EXPIRED',
        'INVOICE_CANCELLED', 'RISK_SCREENING_FAILED',
      ]).optional().describe('Simulated failure'),
    }),
    handler: async (client: LightsparkClient, args: any) => {
      return await client.payTestModeInvoice(args.node_id, args.encoded_invoice, args.timeout_secs, args.maximum_fees_msats, args.failure_reason);
    },
  },
];

export type Tool = (typeof tools)[number];
