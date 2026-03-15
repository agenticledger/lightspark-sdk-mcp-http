/**
 * Lightspark SDK GraphQL API Client
 * Endpoint: https://api.lightspark.com/graphql/server/rc
 * Auth: HTTP Basic Auth (client_id:client_secret)
 */

const DEFAULT_ENDPOINT = 'https://api.lightspark.com/graphql/server/rc';

export class LightsparkClient {
  private clientId: string;
  private clientSecret: string;
  private endpoint: string;

  constructor(clientId: string, clientSecret: string, endpoint?: string) {
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.endpoint = endpoint || DEFAULT_ENDPOINT;
  }

  private getAuthHeader(): string {
    const credentials = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');
    return `Basic ${credentials}`;
  }

  async query<T = any>(gql: string, variables?: Record<string, any>): Promise<T> {
    const response = await fetch(this.endpoint, {
      method: 'POST',
      headers: {
        'Authorization': this.getAuthHeader(),
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({ query: gql, variables }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`API Error ${response.status}: ${text}`);
    }

    const json = await response.json() as any;

    if (json.errors && json.errors.length > 0) {
      throw new Error(`GraphQL Error: ${json.errors.map((e: any) => e.message).join('; ')}`);
    }

    return json.data as T;
  }

  // ===== Account =====

  async getCurrentAccount() {
    return this.query(`{
      current_account {
        id
        name
        nodes {
          count
          entities {
            id
            display_name
            alias
            public_key
            status
            bitcoin_network
            color
            balances {
              owned_balance { original_value original_unit }
              available_to_send_balance { original_value original_unit }
              available_to_withdraw_balance { original_value original_unit }
            }
          }
        }
        api_tokens {
          count
          entities { id name is_deleted permissions }
        }
        blockchain_balance {
          total_balance { original_value original_unit }
          confirmed_balance { original_value original_unit }
          unconfirmed_balance { original_value original_unit }
          available_balance { original_value original_unit }
        }
      }
    }`);
  }

  // ===== Fee Estimates =====

  async getBitcoinFeeEstimate(network: string) {
    return this.query(`query ($network: BitcoinNetwork!) {
      bitcoin_fee_estimate(network: $network) {
        fee_fast { original_value original_unit }
        fee_min { original_value original_unit }
      }
    }`, { network });
  }

  async getLightningFeeEstimateForInvoice(nodeId: string, encodedPaymentRequest: string, amountMsats?: number) {
    return this.query(`query ($input: LightningFeeEstimateForInvoiceInput!) {
      lightning_fee_estimate_for_invoice(input: $input) {
        fee_estimate { original_value original_unit }
      }
    }`, {
      input: {
        node_id: nodeId,
        encoded_payment_request: encodedPaymentRequest,
        ...(amountMsats !== undefined ? { amount_msats: amountMsats } : {}),
      },
    });
  }

  async getLightningFeeEstimateForNode(nodeId: string, destinationPublicKey: string, amountMsats: number) {
    return this.query(`query ($input: LightningFeeEstimateForNodeInput!) {
      lightning_fee_estimate_for_node(input: $input) {
        fee_estimate { original_value original_unit }
      }
    }`, {
      input: {
        node_id: nodeId,
        destination_node_public_key: destinationPublicKey,
        amount_msats: amountMsats,
      },
    });
  }

  async getWithdrawalFeeEstimate(nodeId: string, amountSats: number, withdrawalMode: string) {
    return this.query(`query ($input: WithdrawalFeeEstimateInput!) {
      withdrawal_fee_estimate(input: $input) {
        fee_estimate { original_value original_unit }
      }
    }`, {
      input: {
        node_id: nodeId,
        amount_sats: amountSats,
        withdrawal_mode: withdrawalMode,
      },
    });
  }

  // ===== Invoice & Payment Lookups =====

  async decodePaymentRequest(encodedPaymentRequest: string) {
    return this.query(`query ($encoded: String!) {
      decoded_payment_request(encoded_payment_request: $encoded) {
        __typename
        ... on InvoiceData {
          encoded_payment_request
          bitcoin_network
          payment_hash
          invoice_amount: amount { original_value original_unit }
          created_at
          expires_at
          memo
          destination { id display_name public_key }
        }
      }
    }`, { encoded: encodedPaymentRequest });
  }

  async getEntity(id: string) {
    return this.query(`query ($id: ID!) {
      entity(id: $id) {
        __typename
        ... on IncomingPayment {
          id tx_status: status amount { original_value original_unit } created_at resolved_at
          transaction_hash is_uma payment_request { id }
        }
        ... on OutgoingPayment {
          id tx_status: status amount { original_value original_unit } created_at resolved_at
          transaction_hash fees { original_value original_unit } failure_reason
          payment_preimage idempotency_key is_uma
        }
        ... on Invoice {
          id invoice_status: status amount_paid { original_value original_unit } created_at
          data { encoded_payment_request payment_hash invoice_amount: amount { original_value original_unit } memo expires_at }
        }
        ... on Offer {
          id created_at
          data { encoded_offer offer_amount: amount { original_value original_unit } }
        }
        ... on Wallet {
          id wallet_status: status
          balances { owned_balance { original_value original_unit } available_to_send_balance { original_value original_unit } }
        }
        ... on LightsparkNodeWithOSK {
          id display_name alias node_status: status bitcoin_network public_key color
          balances { owned_balance { original_value original_unit } available_to_send_balance { original_value original_unit } available_to_withdraw_balance { original_value original_unit } }
        }
        ... on LightsparkNodeWithRemoteSigning {
          id display_name alias node_status: status bitcoin_network public_key color
          balances { owned_balance { original_value original_unit } available_to_send_balance { original_value original_unit } available_to_withdraw_balance { original_value original_unit } }
        }
        ... on Channel {
          id channel_status: status capacity { original_value original_unit }
          local_balance { original_value original_unit }
          remote_balance { original_value original_unit }
          short_channel_id
        }
        ... on Deposit { id tx_status: status amount { original_value original_unit } created_at resolved_at num_confirmations }
        ... on Withdrawal { id tx_status: status amount { original_value original_unit } created_at resolved_at num_confirmations }
        ... on WithdrawalRequest { id wr_status: status requested_amount { original_value original_unit } amount_withdrawn { original_value original_unit } bitcoin_address }
        ... on RoutingTransaction { id tx_status: status amount { original_value original_unit } fees { original_value original_unit } created_at resolved_at }
        ... on ApiToken { id name is_deleted permissions }
      }
    }`, { id });
  }

  async getIncomingPaymentsForInvoice(invoiceId: string, statuses?: string[]) {
    return this.query(`query ($input: IncomingPaymentsForInvoiceQueryInput!) {
      incoming_payments_for_invoice(input: $input) {
        payments {
          id status amount { original_value original_unit } created_at resolved_at
          transaction_hash is_uma
        }
      }
    }`, {
      input: {
        invoice_id: invoiceId,
        ...(statuses ? { statuses } : {}),
      },
    });
  }

  async getIncomingPaymentsForPaymentHash(paymentHash: string, statuses?: string[]) {
    return this.query(`query ($input: IncomingPaymentsForPaymentHashQueryInput!) {
      incoming_payments_for_payment_hash(input: $input) {
        payments {
          id status amount { original_value original_unit } created_at resolved_at
          transaction_hash is_uma
        }
      }
    }`, {
      input: {
        payment_hash: paymentHash,
        ...(statuses ? { statuses } : {}),
      },
    });
  }

  async getInvoiceForPaymentHash(paymentHash: string) {
    return this.query(`query ($input: InvoiceForPaymentHashInput!) {
      invoice_for_payment_hash(input: $input) {
        invoice {
          id status created_at
          data { encoded_payment_request payment_hash amount { original_value original_unit } memo expires_at }
          amount_paid { original_value original_unit }
        }
      }
    }`, {
      input: { payment_hash: paymentHash },
    });
  }

  async getOutgoingPaymentByIdempotencyKey(idempotencyKey: string) {
    return this.query(`query ($input: OutgoingPaymentForIdempotencyKeyInput!) {
      outgoing_payment_for_idempotency_key(input: $input) {
        payment {
          id status amount { original_value original_unit } created_at resolved_at
          fees { original_value original_unit } failure_reason
          payment_preimage idempotency_key
        }
      }
    }`, {
      input: { idempotency_key: idempotencyKey },
    });
  }

  async getOutgoingPaymentsForInvoice(encodedInvoice: string, statuses?: string[]) {
    return this.query(`query ($input: OutgoingPaymentsForInvoiceQueryInput!) {
      outgoing_payments_for_invoice(input: $input) {
        payments {
          id status amount { original_value original_unit } created_at resolved_at
          fees { original_value original_unit } failure_reason
        }
      }
    }`, {
      input: {
        encoded_invoice: encodedInvoice,
        ...(statuses ? { statuses } : {}),
      },
    });
  }

  async getOutgoingPaymentsForPaymentHash(paymentHash: string, statuses?: string[]) {
    return this.query(`query ($input: OutgoingPaymentsForPaymentHashQueryInput!) {
      outgoing_payments_for_payment_hash(input: $input) {
        payments {
          id status amount { original_value original_unit } created_at resolved_at
          fees { original_value original_unit } failure_reason
        }
      }
    }`, {
      input: {
        payment_hash: paymentHash,
        ...(statuses ? { statuses } : {}),
      },
    });
  }

  // ===== UMA =====

  async lookupUmaAddress(umaAddress: string) {
    return this.query(`query ($input: LookupUmaAddressInput!) {
      lookup_uma_address(input: $input)
    }`, {
      input: { uma_address: umaAddress },
    });
  }

  async getUmaInvitationByCode(code: string) {
    return this.query(`query ($code: String!) {
      uma_invitation_by_code(code: $code) {
        id
        code
        url
        inviter_uma
        invitee_uma
        status
        created_at
        expires_at
      }
    }`, { code });
  }

  // ===== Payment Mutations =====

  async payInvoice(nodeId: string, encodedInvoice: string, timeoutSecs: number, maximumFeesMsats: number, amountMsats?: number, idempotencyKey?: string) {
    return this.query(`mutation ($input: PayInvoiceInput!) {
      pay_invoice(input: $input) {
        payment {
          id status amount { original_value original_unit } created_at
          fees { original_value original_unit }
        }
      }
    }`, {
      input: {
        node_id: nodeId,
        encoded_invoice: encodedInvoice,
        timeout_secs: timeoutSecs,
        maximum_fees_msats: maximumFeesMsats,
        ...(amountMsats !== undefined ? { amount_msats: amountMsats } : {}),
        ...(idempotencyKey ? { idempotency_key: idempotencyKey } : {}),
      },
    });
  }

  async payOffer(nodeId: string, encodedOffer: string, timeoutSecs: number, maximumFeesMsats: number, amountMsats?: number, idempotencyKey?: string) {
    return this.query(`mutation ($input: PayOfferInput!) {
      pay_offer(input: $input) {
        payment {
          id status amount { original_value original_unit } created_at
          fees { original_value original_unit }
        }
      }
    }`, {
      input: {
        node_id: nodeId,
        encoded_offer: encodedOffer,
        timeout_secs: timeoutSecs,
        maximum_fees_msats: maximumFeesMsats,
        ...(amountMsats !== undefined ? { amount_msats: amountMsats } : {}),
        ...(idempotencyKey ? { idempotency_key: idempotencyKey } : {}),
      },
    });
  }

  async payUmaInvoice(nodeId: string, encodedInvoice: string, timeoutSecs: number, maximumFeesMsats: number, amountMsats?: number, senderHash?: string) {
    return this.query(`mutation ($input: PayUmaInvoiceInput!) {
      pay_uma_invoice(input: $input) {
        payment {
          id status amount { original_value original_unit } created_at
          fees { original_value original_unit }
        }
      }
    }`, {
      input: {
        node_id: nodeId,
        encoded_invoice: encodedInvoice,
        timeout_secs: timeoutSecs,
        maximum_fees_msats: maximumFeesMsats,
        ...(amountMsats !== undefined ? { amount_msats: amountMsats } : {}),
        ...(senderHash ? { sender_hash: senderHash } : {}),
      },
    });
  }

  async sendPayment(nodeId: string, destinationPublicKey: string, amountMsats: number, timeoutSecs: number, maximumFeesMsats: number, idempotencyKey?: string) {
    return this.query(`mutation ($input: SendPaymentInput!) {
      send_payment(input: $input) {
        payment {
          id status amount { original_value original_unit } created_at
          fees { original_value original_unit }
        }
      }
    }`, {
      input: {
        node_id: nodeId,
        destination_public_key: destinationPublicKey,
        amount_msats: amountMsats,
        timeout_secs: timeoutSecs,
        maximum_fees_msats: maximumFeesMsats,
        ...(idempotencyKey ? { idempotency_key: idempotencyKey } : {}),
      },
    });
  }

  // ===== Invoice & Offer Mutations =====

  async createInvoice(nodeId: string, amountMsats: number, memo?: string, invoiceType?: string, expirySecs?: number) {
    return this.query(`mutation ($input: CreateInvoiceInput!) {
      create_invoice(input: $input) {
        invoice {
          id status created_at
          data { encoded_payment_request payment_hash amount { original_value original_unit } memo expires_at }
        }
      }
    }`, {
      input: {
        node_id: nodeId,
        amount_msats: amountMsats,
        ...(memo ? { memo } : {}),
        ...(invoiceType ? { invoice_type: invoiceType } : {}),
        ...(expirySecs !== undefined ? { expiry_secs: expirySecs } : {}),
      },
    });
  }

  async createOffer(nodeId: string, amountMsats?: number, description?: string) {
    return this.query(`mutation ($input: CreateOfferInput!) {
      create_offer(input: $input) {
        offer {
          id created_at
          data { encoded_offer amount { original_value original_unit } }
        }
      }
    }`, {
      input: {
        node_id: nodeId,
        ...(amountMsats !== undefined ? { amount_msats: amountMsats } : {}),
        ...(description ? { description } : {}),
      },
    });
  }

  async createLnurlInvoice(nodeId: string, amountMsats: number, metadataHash: string, expirySecs?: number) {
    return this.query(`mutation ($input: CreateLnurlInvoiceInput!) {
      create_lnurl_invoice(input: $input) {
        invoice {
          id status created_at
          data { encoded_payment_request payment_hash amount { original_value original_unit } memo expires_at }
        }
      }
    }`, {
      input: {
        node_id: nodeId,
        amount_msats: amountMsats,
        metadata_hash: metadataHash,
        ...(expirySecs !== undefined ? { expiry_secs: expirySecs } : {}),
      },
    });
  }

  async createUmaInvoice(nodeId: string, amountMsats: number, metadataHash: string, expirySecs?: number) {
    return this.query(`mutation ($input: CreateUmaInvoiceInput!) {
      create_uma_invoice(input: $input) {
        invoice {
          id status created_at
          data { encoded_payment_request payment_hash amount { original_value original_unit } memo expires_at }
        }
      }
    }`, {
      input: {
        node_id: nodeId,
        amount_msats: amountMsats,
        metadata_hash: metadataHash,
        ...(expirySecs !== undefined ? { expiry_secs: expirySecs } : {}),
      },
    });
  }

  async cancelInvoice(invoiceId: string) {
    return this.query(`mutation ($input: CancelInvoiceInput!) {
      cancel_invoice(input: $input) {
        invoice {
          id status created_at
          data { payment_hash amount { original_value original_unit } memo }
        }
      }
    }`, {
      input: { invoice_id: invoiceId },
    });
  }

  // ===== Wallet & Node Operations =====

  async createNodeWalletAddress(nodeId: string) {
    return this.query(`mutation ($input: CreateNodeWalletAddressInput!) {
      create_node_wallet_address(input: $input) {
        wallet_address
      }
    }`, {
      input: { node_id: nodeId },
    });
  }

  async requestWithdrawal(nodeId: string, bitcoinAddress: string, amountSats: number, withdrawalMode: string, idempotencyKey?: string, feeTarget?: string) {
    return this.query(`mutation ($input: RequestWithdrawalInput!) {
      request_withdrawal(input: $input) {
        request {
          id status
          requested_amount { original_value original_unit }
          estimated_amount { original_value original_unit }
          bitcoin_address
        }
      }
    }`, {
      input: {
        node_id: nodeId,
        bitcoin_address: bitcoinAddress,
        amount_sats: amountSats,
        withdrawal_mode: withdrawalMode,
        ...(idempotencyKey ? { idempotency_key: idempotencyKey } : {}),
        ...(feeTarget ? { fee_target: feeTarget } : {}),
      },
    });
  }

  async fundNode(nodeId: string, amountSats?: number) {
    return this.query(`mutation ($input: FundNodeInput!) {
      fund_node(input: $input) {
        amount { original_value original_unit }
      }
    }`, {
      input: {
        node_id: nodeId,
        ...(amountSats !== undefined ? { amount_sats: amountSats } : {}),
      },
    });
  }

  // ===== API Tokens =====

  async createApiToken(name: string, permissions: string[]) {
    return this.query(`mutation ($input: CreateApiTokenInput!) {
      create_api_token(input: $input) {
        api_token { id name permissions is_deleted client_id }
        client_secret
      }
    }`, {
      input: { name, permissions },
    });
  }

  async deleteApiToken(apiTokenId: string) {
    return this.query(`mutation ($input: DeleteApiTokenInput!) {
      delete_api_token(input: $input) {
        __typename
      }
    }`, {
      input: { api_token_id: apiTokenId },
    });
  }

  // ===== Compliance =====

  async screenNode(provider: string, nodePubkey: string) {
    return this.query(`mutation ($input: ScreenNodeInput!) {
      screen_node(input: $input) {
        rating
      }
    }`, {
      input: { provider, node_pubkey: nodePubkey },
    });
  }

  async registerPayment(provider: string, paymentId: string, nodePubkey: string, direction: string) {
    return this.query(`mutation ($input: RegisterPaymentInput!) {
      register_payment(input: $input) {
        __typename
      }
    }`, {
      input: { provider, payment_id: paymentId, node_pubkey: nodePubkey, direction },
    });
  }

  // ===== UMA Invitations =====

  async createUmaInvitation(inviterUma: string, inviterFirstName?: string) {
    return this.query(`mutation ($input: CreateUmaInvitationInput!) {
      create_uma_invitation(input: $input) {
        invitation {
          id code url inviter_uma status created_at expires_at
        }
      }
    }`, {
      input: {
        inviter_uma: inviterUma,
        ...(inviterFirstName ? { inviter_first_name: inviterFirstName } : {}),
      },
    });
  }

  async claimUmaInvitation(invitationCode: string, inviteeUma: string) {
    return this.query(`mutation ($input: ClaimUmaInvitationInput!) {
      claim_uma_invitation(input: $input) {
        invitation {
          id code url inviter_uma invitee_uma status created_at
        }
      }
    }`, {
      input: { invitation_code: invitationCode, invitee_uma: inviteeUma },
    });
  }

  async cancelUmaInvitation(inviteCode: string) {
    return this.query(`mutation ($input: CancelUmaInvitationInput!) {
      cancel_uma_invitation(input: $input) {
        invitation {
          id code status
        }
      }
    }`, {
      input: { invite_code: inviteCode },
    });
  }

  // ===== Test Mode =====

  async createTestModeInvoice(localNodeId: string, amountMsats: number, memo?: string, invoiceType?: string) {
    return this.query(`mutation ($input: CreateTestModeInvoiceInput!) {
      create_test_mode_invoice(input: $input) {
        encoded_payment_request
      }
    }`, {
      input: {
        local_node_id: localNodeId,
        amount_msats: amountMsats,
        ...(memo ? { memo } : {}),
        ...(invoiceType ? { invoice_type: invoiceType } : {}),
      },
    });
  }

  async createTestModePayment(localNodeId: string, encodedInvoice: string, amountMsats?: number) {
    return this.query(`mutation ($input: CreateTestModePaymentInput!) {
      create_test_mode_payment(input: $input) {
        payment {
          id status amount { original_value original_unit } created_at
        }
      }
    }`, {
      input: {
        local_node_id: localNodeId,
        encoded_invoice: encodedInvoice,
        ...(amountMsats !== undefined ? { amount_msats: amountMsats } : {}),
      },
    });
  }

  async payTestModeInvoice(nodeId: string, encodedInvoice: string, timeoutSecs: number, maximumFeesMsats: number, failureReason?: string) {
    return this.query(`mutation ($input: PayTestModeInvoiceInput!) {
      pay_test_mode_invoice(input: $input) {
        payment {
          id status amount { original_value original_unit } created_at
          failure_reason
        }
      }
    }`, {
      input: {
        node_id: nodeId,
        encoded_invoice: encodedInvoice,
        timeout_secs: timeoutSecs,
        maximum_fees_msats: maximumFeesMsats,
        ...(failureReason ? { failure_reason: failureReason } : {}),
      },
    });
  }
}
