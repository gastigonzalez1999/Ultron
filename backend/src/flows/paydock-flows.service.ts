import { Injectable } from '@nestjs/common';

export interface FlowTemplate {
  name: string;
  description: string;
  steps: FlowStep[];
  categories: ('charges' | 'customers' | 'subscriptions' | '3ds' | 'fraud' | 'network-tokens' | 'gateways' | 'wallets' | 'advanced' | 'ott' | 'vault-tokens' | 'registrations')[];
  primaryCategory: 'charges' | 'customers' | 'subscriptions' | '3ds' | 'fraud' | 'network-tokens' | 'gateways' | 'wallets' | 'advanced' | 'ott' | 'vault-tokens' | 'registrations';
  complexity: 'basic' | 'intermediate' | 'advanced';
  estimatedDuration: string;
  useCase: string; // What real-world scenario this represents
}

export interface FlowStep {
  step: number;
  description: string;
  apiCall?: {
    method: string;
    url: string;
    headers: Record<string, string>;
    body?: any;
  };
  dashboardAction?: string;
  documentation?: string;
  dependsOn?: number[]; // Steps this step depends on
  outgoingEdges?: FlowEdge[];
  retryConfig?: {
    maxAttempts: number;
    delayMs: number;
    backoffMultiplier: number;
  };
}

export interface FlowEdge {
  targetStep: number; // Which step this edge leads to
  condition?: {
    field: string;
    operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than';
    value: any;
    stepNumber: number; // Which step's response to check
  };
  isElse?: boolean; // If true, this is the "else" path (no condition or condition is "else")
  label?: string; // Human-readable label for the edge
}

@Injectable()
export class PaydockFlowsService {

  getFlowTemplates(): FlowTemplate[] {
    return [
      // ===== BASIC CHARGE FLOWS =====
      {
        name: 'Create Charge with Card Data',
        description: 'Create a charge using direct card information',
        categories: ['charges'],
        primaryCategory: 'charges',
        complexity: 'basic',
        estimatedDuration: '30 seconds',
        useCase: 'Direct payment processing with card details',
        steps: [
          {
            step: 1,
            description: 'Create charge with card data',
            apiCall: {
              method: 'POST',
              url: '{{baseUrl}}/v1/charges',
              headers: {
                'Content-Type': 'application/json',
                'x-user-secret-key': '{{secretKey}}'
              },
              body: {
                amount: '14',
                currency: 'AUD',
                customer: {
                  payment_source: {
                    gateway_id: '{{gatewayId}}',
                    card_name: 'Wanda Mertz',
                    card_number: '5123456789012346',
                    expire_month: '08',
                    expire_year: '30',
                    card_ccv: '123'
                  }
                }
              }
            },
            documentation: 'Creates a charge using direct card information. This is the most basic payment flow.'
          }
        ]
      },

      {
        name: 'Create Charge with Vault Token',
        description: 'Create a vault token and then use it to create a charge',
        categories: ['vault-tokens', 'charges'],
        primaryCategory: 'vault-tokens',
        complexity: 'intermediate',
        estimatedDuration: '1 minute',
        useCase: 'Complete payment flow: vault tokenization to charge',
        steps: [
          {
            step: 1,
            description: 'Create vault token from card details',
            apiCall: {
              method: 'POST',
              url: '{{baseUrl}}/v1/vault/payment_sources',
              headers: {
                'Content-Type': 'application/json',
                'x-user-secret-key': '{{secretKey}}'
              },
              body: {
                gateway_id: '{{gatewayId}}',
                card_name: 'Wanda Mertz',
                card_number: '5123456789012346',
                expire_month: '12',
                expire_year: '27',
                card_ccv: '123',
                vault_type: 'permanent'
              }
            },
            documentation: 'Creates a vault token from card details. This token will be used in the next step to create a charge.',
            retryConfig: {
              maxAttempts: 3,
              delayMs: 1000,
              backoffMultiplier: 2
            }
          },
          {
            step: 2,
            description: 'Create charge using the vault token',
            apiCall: {
              method: 'POST',
              url: '{{baseUrl}}/v1/charges',
              headers: {
                'Content-Type': 'application/json',
                'x-user-secret-key': '{{secretKey}}'
              },
              body: {
                amount: '10.00',
                currency: 'AUD',
                reference: '{{vaultChargeReference}}',
                description: 'Charge created using vault token',
                customer: {
                  first_name: 'Wanda',
                  last_name: 'Mertz',
                  email: 'wanda.mertz@example.com',
                  phone: '+61412345678',
                  payment_source: {
                    gateway_id: '{{gatewayId}}',
                    vault_token: '{{step1.vault_token}}'
                  }
                }
              }
            },
            documentation: 'Creates a charge using the vault token from step 1. This completes the payment flow.',
            dependsOn: [1]
          }
        ]
      },

      {
        name: 'Create Charge with OTT',
        description: 'Create a one-time token and then use it to create a charge',
        categories: ['ott', 'network-tokens', 'charges'],
        primaryCategory: 'ott',
        complexity: 'intermediate',
        estimatedDuration: '1 minute',
        useCase: 'Complete payment flow: tokenization to charge',
        steps: [
          {
            step: 1,
            description: 'Create one-time token from card details',
            apiCall: {
              method: 'POST',
              url: '{{baseUrl}}/v1/payment_sources/tokens',
              headers: {
                'Content-Type': 'application/json',
                'x-user-secret-key': '{{secretKey}}'
              },
              body: {
                gateway_id: '{{gatewayId}}',
                card_name: 'Wanda Mertz',
                card_number: '4111111111111111',
                expire_month: '09',
                expire_year: '30',
                card_ccv: '123'
              }
            },
            documentation: 'Creates a one-time token from card details. This token will be used in the next step to create a charge.',
            retryConfig: {
              maxAttempts: 3,
              delayMs: 1000,
              backoffMultiplier: 2
            }
          },
          {
            step: 2,
            description: 'Create charge using the one-time token',
            apiCall: {
              method: 'POST',
              url: '{{baseUrl}}/v1/charges',
              headers: {
                'Content-Type': 'application/json',
                'x-user-secret-key': '{{secretKey}}'
              },
              body: {
                amount: '100',
                currency: 'AUD',
                reference: 'OTT_CHARGE_001',
                description: 'Charge created using one-time token',
                token: '{{step1.one_time_token}}'
              }
            },
            documentation: 'Creates a charge using the one-time token from step 1. This completes the payment flow.',
            dependsOn: [1]
          }
        ]
      },

      {
        name: 'Create Authorization (No Capture)',
        description: 'Create an authorization without capturing funds',
        categories: ['charges'],
        primaryCategory: 'charges',
        complexity: 'basic',
        estimatedDuration: '30 seconds',
        useCase: 'Pre-authorization for hotel bookings or car rentals',
        steps: [
          {
            step: 1,
            description: 'Create authorization without capture',
            apiCall: {
              method: 'POST',
              url: '{{baseUrl}}/v1/charges?capture=false',
              headers: {
                'Content-Type': 'application/json',
                'x-user-secret-key': '{{secretKey}}'
              },
              body: {
                amount: '10.00',
                currency: 'AUD',
                customer: {
                  payment_source: {
                    gateway_id: '{{gatewayId}}',
                    card_name: 'Wanda Mertz',
                    card_number: '4242424242424242',
                    expire_month: '01',
                    expire_year: '30',
                    card_ccv: '123'
                  }
                }
              }
            },
            documentation: 'Creates an authorization without capturing funds. Useful for pre-authorizations.'
          }
        ]
      },

      // ===== VAULT TOKEN FLOWS =====
      {
        name: 'Create Vault Token',
        description: 'Create a vault token for secure card storage',
        categories: ['vault-tokens', 'network-tokens'],
        primaryCategory: 'vault-tokens',
        complexity: 'basic',
        estimatedDuration: '30 seconds',
        useCase: 'Secure card storage for future transactions',
        steps: [
          {
            step: 1,
            description: 'Create vault token from card details',
            apiCall: {
              method: 'POST',
              url: '{{baseUrl}}/v1/vault/payment_sources',
              headers: {
                'Content-Type': 'application/json',
                'x-user-secret-key': '{{secretKey}}'
              },
              body: {
                card_name: 'Wanda Mertz',
                card_number: '5123456789012346',
                expire_month: '12',
                expire_year: '27',
                card_ccv: '123',
                vault_type: 'permanent'
              }
            },
            documentation: 'Creates a vault token for secure card storage. The token can be used for future transactions.'
          }
        ]
      },

      {
        name: 'Create One-Time Token (OTT)',
        description: 'Create a one-time token for single-use payments',
        categories: ['ott', 'network-tokens'],
        primaryCategory: 'ott',
        complexity: 'basic',
        estimatedDuration: '30 seconds',
        useCase: 'Frontend payment tokenization',
        steps: [
          {
            step: 1,
            description: 'Create one-time token',
            apiCall: {
              method: 'POST',
              url: '{{baseUrl}}/v1/payment_sources/tokens',
              headers: {
                'Content-Type': 'application/json',
                'x-user-secret-key': '{{secretKey}}'
              },
              body: {
                gateway_id: '{{gatewayId}}',
                card_name: 'Wanda Mertz',
                card_number: '4111111111111111',
                expire_month: '09',
                expire_year: '30',
                card_ccv: '123'
              }
            },
            documentation: 'Creates a one-time token for single-use payments. Common in frontend flows.'
          }
        ]
      },

      // ===== CUSTOMER FLOWS =====
      {
        name: 'Create Customer with Card',
        description: 'Create a customer with card payment source',
        categories: ['customers'],
        primaryCategory: 'customers',
        complexity: 'basic',
        estimatedDuration: '30 seconds',
        useCase: 'New customer registration with payment method',
        steps: [
          {
            step: 1,
            description: 'Create customer with card payment source',
            apiCall: {
              method: 'POST',
              url: '{{baseUrl}}/v1/customers',
              headers: {
                'Content-Type': 'application/json',
                'x-user-secret-key': '{{secretKey}}'
              },
              body: {
                first_name: 'Wanda',
                payment_source: {
                  gateway_id: '{{gatewayId}}',
                  card_name: 'Wanda Mertz',
                  card_number: '4242424242424242',
                  expire_month: '09',
                  expire_year: '30',
                  card_ccv: '123'
                }
              }
            },
            documentation: 'Creates a customer with card payment source. Foundation for customer management.'
          }
        ]
      },

      {
        name: 'Create Customer with Vault Token',
        description: 'Create a vault token and then use it to create a customer',
        categories: ['vault-tokens', 'customers'],
        primaryCategory: 'vault-tokens',
        complexity: 'intermediate',
        estimatedDuration: '1 minute',
        useCase: 'Complete customer onboarding: vault tokenization to customer creation',
        steps: [
          {
            step: 1,
            description: 'Create vault token from card details',
            apiCall: {
              method: 'POST',
              url: '{{baseUrl}}/v1/vault/payment_sources',
              headers: {
                'Content-Type': 'application/json',
                'x-user-secret-key': '{{secretKey}}'
              },
              body: {
                gateway_id: '{{gatewayId}}',
                card_name: 'Wanda Mertz',
                card_number: '5123456789012346',
                expire_month: '12',
                expire_year: '27',
                card_ccv: '123',
                vault_type: 'permanent'
              }
            },
            documentation: 'Creates a vault token from card details. This token will be used in the next step to create a customer.',
            retryConfig: {
              maxAttempts: 3,
              delayMs: 1000,
              backoffMultiplier: 2
            }
          },
          {
            step: 2,
            description: 'Create customer using the vault token',
            apiCall: {
              method: 'POST',
              url: '{{baseUrl}}/v1/customers',
              headers: {
                'Content-Type': 'application/json',
                'x-user-secret-key': '{{secretKey}}'
              },
              body: {
                first_name: 'Wanda',
                last_name: 'Mertz',
                email: 'wanda.mertz@example.com',
                phone: '+61412345678',
                payment_source: {
                  gateway_id: '{{gatewayId}}',
                  vault_token: '{{step1.vault_token}}'
                }
              }
            },
            documentation: 'Creates a customer using the vault token from step 1. This completes the customer onboarding flow.',
            dependsOn: [1]
          }
        ]
      },

      {
        name: 'Create Customer with OTT',
        description: 'Create a one-time token and then use it to create a customer',
        categories: ['ott', 'network-tokens', 'customers'],
        primaryCategory: 'ott',
        complexity: 'intermediate',
        estimatedDuration: '1 minute',
        useCase: 'Complete customer onboarding: tokenization to customer creation',
        steps: [
          {
            step: 1,
            description: 'Create one-time token from card details',
            apiCall: {
              method: 'POST',
              url: '{{baseUrl}}/v1/payment_sources/tokens',
              headers: {
                'Content-Type': 'application/json',
                'x-user-secret-key': '{{secretKey}}'
              },
              body: {
                gateway_id: '{{gatewayId}}',
                card_name: 'Wanda Mertz',
                card_number: '4111111111111111',
                expire_month: '09',
                expire_year: '30',
                card_ccv: '123'
              }
            },
            documentation: 'Creates a one-time token from card details. This token will be used in the next step to create a customer.',
            retryConfig: {
              maxAttempts: 3,
              delayMs: 1000,
              backoffMultiplier: 2
            }
          },
          {
            step: 2,
            description: 'Create customer using the one-time token',
            apiCall: {
              method: 'POST',
              url: '{{baseUrl}}/v1/customers',
              headers: {
                'Content-Type': 'application/json',
                'x-user-secret-key': '{{secretKey}}'
              },
              body: {
                first_name: 'Wanda',
                last_name: 'Mertz',
                email: 'wanda.mertz@example.com',
                phone: '+61412345678',
                phone2: '+380661231212',
                token: '{{step1.one_time_token}}'
              }
            },
            documentation: 'Creates a customer using the one-time token from step 1. This completes the customer onboarding flow.',
            dependsOn: [1]
          }
        ]
      },

      // ===== 3DS FLOWS =====
      {
        name: 'Inbuild 3DS with Fraud Charge ID',
        description: 'Create 3DS charge with fraud charge ID for enhanced security',
        categories: ['3ds', 'fraud'],
        primaryCategory: '3ds',
        complexity: 'intermediate',
        estimatedDuration: '1 minute',
        useCase: 'High-security transactions with fraud detection',
        steps: [
          {
            step: 1,
            description: 'Create 3DS charge with fraud charge ID',
            apiCall: {
              method: 'POST',
              url: '{{baseUrl}}/v1/charges/3ds',
              headers: {
                'Content-Type': 'application/json',
                'x-user-secret-key': '{{secretKey}}'
              },
              body: {
                amount: '10',
                currency: 'AUD',
                fraud_charge_id: '{{fraudChargeId}}',
                _3ds: {
                  browser_details: {
                    name: 'chrome',
                    java_enabled: 'true',
                    language: 'en-US',
                    screen_height: '640',
                    screen_width: '480',
                    time_zone: '273',
                    color_depth: '24'
                  }
                },
                customer: {
                  phone2: '+3333333333333333',
                  payment_source: {
                    address_company: '3ds_address_company',
                    vault_token: '{{vaultToken}}',
                    gateway_id: '{{gatewayId}}'
                  }
                },
                shipping: {
                  method: 'GROUND',
                  address_line1: 'address_line1',
                  address_line2: 'address_line2',
                  address_city: 'address_city',
                  address_state: 'qqqqqqqqqqqqqqqqqqqq',
                  address_country: 'USdssdf',
                  address_postcode: '345345',
                  address_company: 'shipping_address_company',
                  address_origin_postcode: '3453533',
                  contact: {
                    first_name: 'shipping_first_name',
                    last_name: 'fdajfnsdfksdbfjsdbfjsdfbsdjfbsdjfdbsfjdsbfjhfbfhha',
                    email: 'disposable.style.email.with+symbol@example.com',
                    phone: '+444444444444444',
                    phone2: '+55555555555555'
                  }
                }
              }
            },
            documentation: 'Creates a 3DS charge with fraud charge ID for enhanced security and fraud detection.'
          }
        ]
      },

      {
        name: 'Inbuild 3DS with Token/OTT',
        description: 'Create one-time token and then use it for 3DS authentication',
        categories: ['3ds', 'ott', 'network-tokens'],
        primaryCategory: '3ds',
        complexity: 'intermediate',
        estimatedDuration: '2 minutes',
        useCase: 'Complete 3DS authentication flow: tokenization to 3DS charge',
        steps: [
          {
            step: 1,
            description: 'Create one-time token from card details',
            apiCall: {
              method: 'POST',
              url: '{{baseUrl}}/v1/payment_sources/tokens',
              headers: {
                'Content-Type': 'application/json',
                'x-user-secret-key': '{{secretKey}}'
              },
              body: {
                gateway_id: '{{gatewayId}}',
                card_name: 'Wanda Mertz',
                card_number: '4111111111111111',
                expire_month: '09',
                expire_year: '30',
                card_ccv: '123'
              }
            },
            documentation: 'Creates a one-time token from card details. This token will be used in the next step for 3DS authentication.',
            retryConfig: {
              maxAttempts: 3,
              delayMs: 1000,
              backoffMultiplier: 2
            }
          },
          {
            step: 2,
            description: 'Create 3DS charge using the one-time token',
            apiCall: {
              method: 'POST',
              url: '{{baseUrl}}/v1/charges/3ds',
              headers: {
                'Content-Type': 'application/json',
                'x-user-secret-key': '{{secretKey}}'
              },
                              body: {
                  amount: '100',
                  currency: 'AUD',
                  reference: '{{3dsReference}}',
                description: '3DS charge created using one-time token',
                token: '{{step1.one_time_token}}',
                _3ds: {
                  browser_details: {
                    name: 'CHROME',
                    java_enabled: 'true',
                    language: 'en-US',
                    screen_height: '640',
                    screen_width: '480',
                    time_zone: '273',
                    color_depth: '24'
                  }
                }
              }
            },
            documentation: 'Creates a 3DS charge using the one-time token from step 1. This completes the 3DS authentication flow.',
            dependsOn: [1]
          }
        ]
      },

      {
        name: 'Standalone 3DS',
        description: 'Complete standalone 3DS authentication flow',
        categories: ['3ds'],
        primaryCategory: '3ds',
        complexity: 'basic',
        estimatedDuration: '30 seconds',
        useCase: '3DS authentication with detailed customer data',
        steps: [
          {
            step: 1,
            description: 'Create standalone 3DS charge',
            apiCall: {
              method: 'POST',
              url: '{{baseUrl}}/v1/charges/standalone-3ds',
              headers: {
                'Content-Type': 'application/json',
                'x-user-secret-key': '{{secretKey}}'
              },
              body: {
                amount: '10',
                currency: 'AUD',
                reference: '{{3dsReference}}',
                _3ds: {
                  service_id: '{{gpaymentsService}}',
                  authentication: {
                    account_id: 'ActiveServer 3DS Test Account 000000001',
                    type: '01',
                    challenge_type: '01',
                    merchant_name: 'Test Merchant',
                    date: '2021-12-13T20:06:05.521Z',
                    whitelisted: true,
                    version: '2.1.0',
                    method: '01',
                    auth_data: 'Randome data',
                    customer: {
                      created_at: '2020-12-13T20:06:05.521Z',
                      updated_at: '2020-12-13T20:06:05.521Z',
                      credentials_updated_at: '2020-12-13T20:06:05.521Z',
                      suspicious: false,
                      payment_source: {
                        created_at: '2020-12-13T20:06:05.521Z',
                        add_attempts: ['2020-12-13T20:06:05.521Z'],
                        card_type: '02'
                      },
                      activity_history: {
                        transactions_count_last_day: 1,
                        transactions_count_last_six_months: 6,
                        transactions_count_last_year: 10,
                        shipping_address_created_at: '2020-12-13T20:06:05.521Z'
                      }
                    },
                    risk: {
                      redeem_amount: '0',
                      redeem_currency: 'USD',
                      redeem_count: 0,
                      pre_order_date: '2021-12-13T20:06:05.521Z',
                      reorder: '01',
                      shipping: '01'
                    },
                    decoupled: {
                      timeout: '00010',
                      enabled: true
                    },
                    recurring: {
                      expiry: '2021-12-13T20:06:05.521Z',
                      frequency_days: 2
                    }
                  }
                },
                customer: {
                  first_name: 'Wanda',
                  last_name: 'Mertz',
                  email: 'wanda.mertz1@example.com',
                  phone: '+380661231212',
                  phone2: '+380661231212',
                  payment_source: {
                    vault_token: '{{vaultToken}}',
                    address_city: 'Lake Robyn',
                    address_country: 'US',
                    address_line1: '61426 Osvaldo Plains',
                    address_line2: 'Apt. 276',
                    address_line3: 'Lake Robyn',
                    address_postcode: '07396',
                    address_state: 'WY'
                  }
                },
                shipping: {
                  address_city: 'Lake Robyn',
                  address_country: 'US',
                  address_line1: '61426 Osvaldo Plains',
                  address_line2: 'Apt. 276',
                  address_line3: 'Lake Robyn',
                  address_postcode: '07396',
                  address_state: 'WY',
                  method: '02',
                  contact: {
                    email: 'wanda.mertz@example.com',
                    first_name: 'Wanda1',
                    last_name: 'Mertz1'
                  }
                }
              }
            },
            documentation: 'Creates a comprehensive standalone 3DS charge with detailed authentication data.'
          }
        ]
      },

      // ===== FRAUD FLOWS =====
      {
        name: 'Standalone Fraud',
        description: 'Create standalone fraud charge',
        categories: ['fraud'],
        primaryCategory: 'fraud',
        complexity: 'intermediate',
        estimatedDuration: '1 minute',
        useCase: 'Fraud for high-risk transactions',
        steps: [
          {
            step: 1,
            description: 'Create standalone fraud charge',
            apiCall: {
              method: 'POST',
              url: '{{baseUrl}}/v1/charges/fraud',
              headers: {
                'Content-Type': 'application/json',
                'x-user-secret-key': '{{secretKey}}'
              },
              body: {
                amount: 10,
                currency: 'USD',
                first_name: 'Wanda',
                last_name: 'Mertz',
                email: 'martin@paydock.com',
                customer: {
                  payment_source: {
                    vault_token: '{{vaultToken}}'
                  }
                },
                fraud: {
                  service_id: '{{forterServiceId}}',
                  data: {
                    transaction: {
                      billing: {
                        customerEmailAddress: 'reject@example.com'
                      }
                    }
                  }
                }
              }
            },
            documentation: 'Creates a standalone fraud charge for risk assessment.'
          }
        ]
      },

      {
        name: 'Fraud Charge with Forter',
        description: 'Create fraud charge with Forter integration',
        categories: ['fraud'],
        primaryCategory: 'fraud',
        complexity: 'basic',
        estimatedDuration: '30 seconds',
        useCase: 'Fraud detection with Forter service',
        steps: [
          {
            step: 1,
            description: 'Create fraud charge with Forter',
            apiCall: {
              method: 'POST',
              url: '{{baseUrl}}/v1/charges/fraud',
              headers: {
                'Content-Type': 'application/json',
                'x-user-secret-key': '{{secretKey}}'
              },
                              body: {
                  currency: 'AUD',
                  amount: '33',
                  reference: '{{fraudReference}}',
                description: 'description1',
                meta: {},
                customer: {
                  first_name: 'Alexander',
                  email: 'approve@forter.com',
                  phone: '+380500000001',
                  last_name: 'Alex',
                  reference: 'Reference1',
                  payment_source: {
                    address_country: 'AU',
                    amount: 33,
                    address_line1: 'Pogranichnaya 8a',
                    address_line2: 'flat8',
                    address_city: 'Postishevo',
                    address_state: 'Australian Capital Territory',
                    address_postcode: '3244',
                    card_issuer: 'visa',
                    card_type: 'credit',
                    vault_token: '{{vaultToken}}',
                    type: 'vault_token'
                  }
                },
                custom_fields: [
                  {
                    key: 'kkkk',
                    value: '123'
                  }
                ],
                fraud: {
                  service_id: '{{forterServiceId}}',
                  token: '{{forterToken}}',
                  data: {
                    customerAccountData: {
                      type: 'GUEST'
                    },
                    additionalIdentifiers: {
                      additionalOrderId: 'ORDER123'
                    },
                    cartItems: [
                      {
                        basicItemData: {
                          name: 'testname123',
                          price: {
                            amountLocalCurrency: '12',
                            amountUSD: '12',
                            currency: 'USD'
                          },
                          quantity: 2,
                          type: 'TANGIBLE'
                        }
                      }
                    ]
                  }
                },
                order_type: 'web'
              }
            },
            documentation: 'Creates a comprehensive fraud charge with Forter integration and detailed transaction data.'
          }
        ]
      },

      // ===== WALLET FLOWS =====
      {
        name: 'Wallet Charge',
        description: 'Create a wallet-based charge',
        categories: ['wallets'],
        primaryCategory: 'wallets',
        complexity: 'basic',
        estimatedDuration: '30 seconds',
        useCase: 'Digital wallet payment processing',
        steps: [
          {
            step: 1,
            description: 'Create wallet charge',
            apiCall: {
              method: 'POST',
              url: '{{baseUrl}}/v1/charges/wallet',
              headers: {
                'Content-Type': 'application/json',
                'x-user-secret-key': '{{secretKey}}'
              },
              body: {
                amount: 1,
                reference: '{{walletReference}}',
                description: 'description418',
                currency: 'AUD',
                customer: {
                  email: 'asd@test.com',
                  first_name: 'name',
                  last_name: 'last_name',
                  phone: '+5555555555',
                  payment_source: {
                    gateway_id: '{{walletGatewayId}}',
                    address_line1: 'asd1',
                    address_line2: 'asd2',
                    address_line3: 'asd3',
                    address_city: 'city',
                    address_state: 'state',
                    address_country: 'US',
                    address_postcode: '12345'
                  }
                },
                meta: {
                  store_id: '1234',
                  store_name: 'Store 1234',
                  merchant_name: 'Test Merchant Name'
                },
                shipping: {
                  amount: 1,
                  currency: 'AUD',
                  address_line1: 'ship1',
                  address_line2: 'ship22',
                  address_line3: 'ship3',
                  address_city: 'shipcity',
                  address_state: 'shipstate',
                  address_country: 'US',
                  address_postcode: '123456',
                  contact: {
                    first_name: 'ship_contact',
                    last_name: 'contact_last_name',
                    phone: '+5555555556'
                  }
                }
              }
            },
            documentation: 'Creates a wallet-based charge with comprehensive customer and shipping data.'
          }
        ]
      },

      // ===== NETWORK TOKEN FLOWS =====
      {
        name: 'Complete Network Token Creation',
        description: 'Full network token creation flow: registration, webhook, service ID, vault token, and network token',
        categories: ['registrations', 'network-tokens', 'vault-tokens'],
        primaryCategory: 'registrations',
        complexity: 'advanced',
        estimatedDuration: '3 minutes',
        useCase: 'Complete network token setup for secure payments',
        steps: [
          {
            step: 1,
            description: 'Create SCOF registration',
            apiCall: {
              method: 'POST',
              url: '{{baseUrl}}/v1/registrations',
              headers: {
                'Content-Type': 'application/json',
                'x-user-secret-key': '{{secretKey}}'
              },
              body: {
                name: 'NT Gasti Registration VisaVTS1',
                mode: 'test',
                group: 'network_token',
                type: 'MastercardSCOF',
                program_name: 'Gastu Progri Name',
                merchant_data: {
                  business_identification_type: 'ABN',
                  business_identification_value: 'tienda inglesa',
                  company_name: 'test',
                  address_city: 'test',
                  address_country: 'UY',
                  url: 'https://google.com',
                  contact: {
                    email: 'test@gmail.com'
                  }
                }
              }
            },
            documentation: 'Creates a SCOF registration for network token program. This is the first step in network token creation.',
            retryConfig: {
              maxAttempts: 3,
              delayMs: 2000,
              backoffMultiplier: 2
            }
          },
          {
            step: 2,
            description: 'Simulate DPA Registration Webhook',
            apiCall: {
              method: 'POST',
              url: '{{webhookUrl}}',
              headers: {
                'Content-Type': 'application/json',
                'x-paydock-event': 'dpa.registration.completed',
                'x-paydock-signature': 'test-signature'
              },
              body: {
                batchEndTime: '2021-01-01T13:37:45.000Z',
                batchId: '{{step1.transactions.0.external_id}}',
                batchStartTime: '2021-01-01T13:37:45.000Z',
                batchStatus: 'COMPLETED_SUCCESSFULLY',
                errorMessage: null,
                items: [
                  {
                    action: 'ADD',
                    dpaResults: [
                      {
                        dpaName: 'test',
                        error: null,
                        srcDpaId: '{{step1.external_id}}',
                        status: 'SUCCESSFUL',
                        registrationId: '{{step1._id}}'
                      }
                    ],
                    error: null,
                    programName: 'Gastu Progri Name',
                    serviceId: '{{step1._id}}',
                    status: 'SUCCESSFUL',
                    registrationId: '{{step1._id}}'
                  }
                ],
                requestId: '{{step1.transactions.0.external_id}}',
                registrationId: '{{step1._id}}'
              }
            },
            documentation: 'Simulates the DPA registration webhook using data from the registration response. This webhook confirms successful registration and provides the service ID needed for network token creation.',
            dependsOn: [1],
            retryConfig: {
              maxAttempts: 3,
              delayMs: 2000,
              backoffMultiplier: 1.5
            }
          },
          {
            step: 3,
            description: 'Check registration status',
            apiCall: {
              method: 'GET',
              url: '{{baseUrl}}/v1/registrations/{{step1._id}}',
              headers: {
                'Content-Type': 'application/json',
                'x-user-secret-key': '{{secretKey}}'
              }
            },
            documentation: 'Checks the registration status to ensure it has been completed before proceeding to service creation.',
            dependsOn: [1, 2],
            retryConfig: {
              maxAttempts: 8,
              delayMs: 8000,
              backoffMultiplier: 1.2
            }
          },
          {
            step: 4,
            description: 'Create network token service ID using registration ID',
            apiCall: {
              method: 'POST',
              url: '{{baseUrl}}/v1/services',
              headers: {
                'Content-Type': 'application/json',
                'x-user-secret-key': '{{secretKey}}'
              },
              body: {
                name: 'NT Service for SCOF Gasti alpha',
                group: 'network_token',
                type: 'MastercardSCOF',
                mode: 'test',
                registration_id: '{{step1._id}}'
              }
            },
            documentation: 'Creates a network token service using the registration ID from step 1. The registration must be in completed status.',
            dependsOn: [1, 2, 3],
            retryConfig: {
              maxAttempts: 5,
              delayMs: 3000,
              backoffMultiplier: 1.5
            }
          },
          {
            step: 5,
            description: 'Create vault token',
            apiCall: {
              method: 'POST',
              url: '{{baseUrl}}/v1/vault/payment_sources',
              headers: {
                'Content-Type': 'application/json',
                'x-user-secret-key': '{{secretKey}}'
              },
              body: {
                card_name: 'Wanda Mertz',
                card_number: '5123456789012346',
                expire_month: '12',
                expire_year: '27',
                card_ccv: '123',
                vault_type: 'permanent'
              }
            },
            documentation: 'Creates a vault token that will be used to create the network token.',
            dependsOn: [1, 2, 3, 4]
          },
          {
            step: 6,
            description: 'Create network token with vault token and service ID',
            apiCall: {
              method: 'POST',
              url: '{{baseUrl}}/v1/vault-tokens/{{step5.vault_token}}/network-tokens',
              headers: {
                'Content-Type': 'application/json',
                'x-user-secret-key': '{{secretKey}}'
              },
              body: {
                service_id: '{{step4._id}}'
              }
            },
            documentation: 'Creates the final network token using the vault token from step 5 and service ID from step 4.',
            dependsOn: [1, 2, 3, 4, 5]
          }
        ]
      },

      {
        name: 'DPA Registration Webhook Simulation',
        description: 'Simulate DPA registration webhook with real registration data',
        categories: ['registrations', 'network-tokens'],
        primaryCategory: 'registrations',
        complexity: 'intermediate',
        estimatedDuration: '1 minute',
        useCase: 'Test webhook handling for network token registration',
        steps: [
          {
            step: 1,
            description: 'Create SCOF registration for webhook data',
            apiCall: {
              method: 'POST',
              url: '{{baseUrl}}/v1/registrations',
              headers: {
                'Content-Type': 'application/json',
                'x-user-secret-key': '{{secretKey}}'
              },
              body: {
                name: 'NT Gasti Registration VisaVTS1',
                mode: 'test',
                group: 'network_token',
                type: 'MastercardSCOF',
                program_name: 'Gastu Progri Name',
                merchant_data: {
                  business_identification_type: 'ABN',
                  business_identification_value: 'tienda inglesa',
                  company_name: 'test',
                  address_city: 'test',
                  address_country: 'UY',
                  url: 'https://google.com',
                  contact: {
                    email: 'test@gmail.com'
                  }
                }
              }
            },
            documentation: 'Creates a SCOF registration to get the data needed for webhook simulation.',
            retryConfig: {
              maxAttempts: 3,
              delayMs: 2000,
              backoffMultiplier: 2
            }
          },
          {
            step: 2,
            description: 'Simulate DPA registration webhook with registration data',
            apiCall: {
              method: 'POST',
              url: '{{webhookUrl}}',
              headers: {
                'Content-Type': 'application/json',
                'x-paydock-event': 'dpa.registration.completed'
              },
              body: {
                batchEndTime: '2021-01-01T13:37:45.000Z',
                batchId: '{{step1.batchId}}',
                batchStartTime: '2021-01-01T13:37:45.000Z',
                batchStatus: 'COMPLETED_SUCCESSFULLY',
                errorMessage: null,
                items: [
                  {
                    action: 'ADD',
                    dpaResults: [
                      {
                        dpaName: '{{step1.dpaName}}',
                        error: null,
                        srcDpaId: '{{step1.srcDpaId}}',
                        status: 'SUCCESSFUL'
                      }
                    ],
                    error: null,
                    programName: '{{step1.programName}}',
                    serviceId: '{{step1.serviceId}}',
                    status: 'SUCCESSFUL'
                  }
                ],
                requestId: '{{step1.requestId}}'
              }
            },
            documentation: 'Simulates the DPA registration webhook using data from the registration response. This webhook confirms successful registration and provides the service ID needed for network token creation.',
            dependsOn: [1]
          }
        ]
      },

      // ===== SUBSCRIPTION FLOWS =====
      {
        name: 'Create Subscription with Card Data',
        description: 'Create subscription using direct card information',
        categories: ['subscriptions'],
        primaryCategory: 'subscriptions',
        complexity: 'basic',
        estimatedDuration: '30 seconds',
        useCase: 'Recurring billing with card details',
        steps: [
          {
            step: 1,
            description: 'Create subscription with card data',
            apiCall: {
              method: 'POST',
              url: '{{baseUrl}}/v1/subscriptions',
              headers: {
                'Content-Type': 'application/json',
                'x-user-secret-key': '{{secretKey}}'
              },
              body: {
                amount: '10.00',
                currency: 'AUD',
                reference: '{{subscriptionReference}}',
                description: 'Vitae commodi provident assumenda',
                order_id: 'order_idfdsf',
                transaction_id: 'transaction_idvdsavasf',
                gateway_id: '{{gatewayId}}',
                customer: {
                  first_name: 'Wanda',
                  last_name: 'Mertz',
                  email: 'wanda.mertz@example.com',
                  reference: 'CustomReference',
                  payment_source: {
                    address_line1: 'Suite 660',
                    address_line2: '822 Ruiz Square',
                    address_city: 'Lake Edward',
                    address_state: 'TAS',
                    address_country: 'AU',
                    address_postcode: '1234',
                    gateway_id: '{{gatewayId}}',
                    card_name: 'Wanda Mertz',
                    card_number: '4242424242424242',
                    expire_month: '09',
                    expire_year: '26',
                    card_ccv: '123'
                  }
                },
                schedule: {
                  frequency: '1',
                  interval: 'day'
                }
              }
            },
            documentation: 'Creates a subscription using direct card information for recurring billing.'
          }
        ]
      },

      {
        name: 'Create Subscription with Vault Token',
        description: 'Create a vault token and then use it to create a subscription',
        categories: ['vault-tokens', 'subscriptions'],
        primaryCategory: 'vault-tokens',
        complexity: 'intermediate',
        estimatedDuration: '1 minute',
        useCase: 'Complete subscription flow: vault tokenization to subscription creation',
        steps: [
          {
            step: 1,
            description: 'Create vault token from card details',
            apiCall: {
              method: 'POST',
              url: '{{baseUrl}}/v1/vault/payment_sources',
              headers: {
                'Content-Type': 'application/json',
                'x-user-secret-key': '{{secretKey}}'
              },
              body: {
                gateway_id: '{{gatewayId}}',
                card_name: 'Wanda Mertz',
                card_number: '5123456789012346',
                expire_month: '12',
                expire_year: '27',
                card_ccv: '123',
                vault_type: 'permanent'
              }
            },
            documentation: 'Creates a vault token from card details. This token will be used in the next step to create a subscription.',
            retryConfig: {
              maxAttempts: 3,
              delayMs: 1000,
              backoffMultiplier: 2
            }
          },
          {
            step: 2,
            description: 'Create subscription using the vault token',
            apiCall: {
              method: 'POST',
              url: '{{baseUrl}}/v1/subscriptions',
              headers: {
                'Content-Type': 'application/json',
                'x-user-secret-key': '{{secretKey}}'
              },
                              body: {
                  amount: '10.00',
                  currency: 'AUD',
                  reference: '{{vaultSubscriptionReference}}',
                description: 'Subscription created using vault token',
                customer: {
                  payment_source: {
                    gateway_id: '{{gatewayId}}',
                    vault_token: '{{step1.vault_token}}'
                  }
                },
                schedule: {
                  frequency: '1',
                  interval: 'month',
                  start_date: '{{startDate}}',
                  end_date: '{{endDate}}'
                }
              }
            },
            documentation: 'Creates a subscription using the vault token from step 1. This completes the subscription flow.',
            dependsOn: [1]
          }
        ]
      },

      {
        name: 'Create Subscription with Customer',
        description: 'Create a customer and then use that customer to create a subscription',
        categories: ['subscriptions', 'customers'],
        primaryCategory: 'subscriptions',
        complexity: 'intermediate',
        estimatedDuration: '1 minute',
        useCase: 'Complete subscription flow: customer creation to subscription',
        steps: [
          {
            step: 1,
            description: 'Create customer with card payment source',
            apiCall: {
              method: 'POST',
              url: '{{baseUrl}}/v1/customers',
              headers: {
                'Content-Type': 'application/json',
                'x-user-secret-key': '{{secretKey}}'
              },
              body: {
                first_name: 'Wanda',
                last_name: 'Mertz',
                email: 'wanda.mertz@example.com',
                phone: '+61412345678',
                payment_source: {
                  gateway_id: '{{gatewayId}}',
                  card_name: 'Wanda Mertz',
                  card_number: '4242424242424242',
                  expire_month: '09',
                  expire_year: '30',
                  card_ccv: '123'
                }
              }
            },
            documentation: 'Creates a customer with card payment source. This customer will be used in the next step to create a subscription.',
            retryConfig: {
              maxAttempts: 3,
              delayMs: 1000,
              backoffMultiplier: 2
            }
          },
          {
            step: 2,
            description: 'Create subscription using the customer from step 1',
            apiCall: {
              method: 'POST',
              url: '{{baseUrl}}/v1/subscriptions',
              headers: {
                'Content-Type': 'application/json',
                'x-user-secret-key': '{{secretKey}}'
              },
                              body: {
                  amount: '10.00',
                  currency: 'AUD',
                  reference: '{{subscriptionReference}}',
                description: 'Subscription created for customer from step 1',
                customer_id: '{{step1._id}}',
                schedule: {
                  frequency: '1',
                  interval: 'month',
                  start_date: '{{startDate}}',
                  end_date: '{{endDate}}'
                }
              }
            },
            documentation: 'Creates a subscription using the customer ID from step 1. This completes the subscription flow.',
            dependsOn: [1]
          }
        ]
      },

      {
        name: 'Create Subscription with OTT',
        description: 'Create a one-time token and then use it to create a subscription',
        categories: ['ott', 'network-tokens', 'subscriptions'],
        primaryCategory: 'ott',
        complexity: 'intermediate',
        estimatedDuration: '1 minute',
        useCase: 'Complete subscription flow: tokenization to subscription creation',
        steps: [
          {
            step: 1,
            description: 'Create one-time token from card details',
            apiCall: {
              method: 'POST',
              url: '{{baseUrl}}/v1/payment_sources/tokens',
              headers: {
                'Content-Type': 'application/json',
                'x-user-secret-key': '{{secretKey}}'
              },
              body: {
                gateway_id: '{{gatewayId}}',
                card_name: 'Wanda Mertz',
                card_number: '4111111111111111',
                expire_month: '09',
                expire_year: '30',
                card_ccv: '123'
              }
            },
            documentation: 'Creates a one-time token from card details. This token will be used in the next step to create a subscription.',
            retryConfig: {
              maxAttempts: 3,
              delayMs: 1000,
              backoffMultiplier: 2
            }
          },
          {
            step: 2,
            description: 'Create subscription using the one-time token',
            apiCall: {
              method: 'POST',
              url: '{{baseUrl}}/v1/subscriptions',
              headers: {
                'Content-Type': 'application/json',
                'x-user-secret-key': '{{secretKey}}'
              },
                              body: {
                  amount: '10.00',
                  currency: 'AUD',
                  reference: '{{ottSubscriptionReference}}',
                description: 'Subscription created using one-time token',
                token: '{{step1.one_time_token}}',
                schedule: {
                  frequency: '1',
                  interval: 'month',
                  start_date: '{{startDate}}',
                  end_date: '{{endDate}}'
                }
              }
            },
            documentation: 'Creates a subscription using the one-time token from step 1. This completes the subscription flow.',
            dependsOn: [1]
          }
        ]
      },

      // ===== POST-TRANSACTION FLOWS =====
      {
        name: 'Capture Authorization',
        description: 'Capture a previously authorized transaction',
        categories: ['charges'],
        primaryCategory: 'charges',
        complexity: 'basic',
        estimatedDuration: '30 seconds',
        useCase: 'Capture pre-authorized funds',
        steps: [
          {
            step: 1,
            description: 'Capture authorized charge',
            apiCall: {
              method: 'POST',
              url: '{{baseUrl}}/v1/charges/{{chargeId}}/capture',
              headers: {
                'Content-Type': 'application/json',
                'x-user-secret-key': '{{secretKey}}'
              }
            },
            documentation: 'Captures funds from a previously authorized transaction.'
          }
        ]
      },

      {
        name: 'Refund Transaction',
        description: 'Refund a completed transaction',
        categories: ['charges'],
        primaryCategory: 'charges',
        complexity: 'basic',
        estimatedDuration: '30 seconds',
        useCase: 'Process customer refunds',
        steps: [
          {
            step: 1,
            description: 'Refund charge',
            apiCall: {
              method: 'POST',
              url: '{{baseUrl}}/v1/charges/{{chargeId}}/refunds',
              headers: {
                'Content-Type': 'application/json',
                'x-user-secret-key': '{{secretKey}}'
              }
            },
            documentation: 'Refunds a completed transaction to the original payment method.'
          }
        ]
      },

      {
        name: 'Void/Cancel Authorization',
        description: 'Void or cancel an authorized transaction',
        categories: ['charges'],
        primaryCategory: 'charges',
        complexity: 'basic',
        estimatedDuration: '30 seconds',
        useCase: 'Cancel pre-authorized transactions',
        steps: [
          {
            step: 1,
            description: 'Void authorized charge',
            apiCall: {
              method: 'DELETE',
              url: '{{baseUrl}}/v1/charges/{{chargeId}}/capture',
              headers: {
                'Content-Type': 'application/json',
                'x-user-secret-key': '{{secretKey}}'
              }
            },
            documentation: 'Voids or cancels an authorized transaction before capture.'
          }
        ]
      },

      {
        name: 'Get Charge Details',
        description: 'Retrieve detailed information about a charge',
        categories: ['charges'],
        primaryCategory: 'charges',
        complexity: 'basic',
        estimatedDuration: '30 seconds',
        useCase: 'View transaction details and status',
        steps: [
          {
            step: 1,
            description: 'Get charge details',
            apiCall: {
              method: 'GET',
              url: '{{baseUrl}}/v1/charges/{{chargeId}}',
              headers: {
                'Content-Type': 'application/json',
                'x-user-secret-key': '{{secretKey}}'
              }
            },
            documentation: 'Retrieves detailed information about a specific charge.'
          }
        ]
      },

      // ===== VERIFICATION FLOWS =====
      {
        name: 'Card Verification',
        description: 'Verify card details without making a charge',
        categories: ['charges'],
        primaryCategory: 'charges',
        complexity: 'basic',
        estimatedDuration: '30 seconds',
        useCase: 'Validate card information before processing',
        steps: [
          {
            step: 1,
            description: 'Verify card details',
            apiCall: {
              method: 'POST',
              url: '{{baseUrl}}/v1/charges/verification',
              headers: {
                'Content-Type': 'application/json',
                'x-user-secret-key': '{{secretKey}}'
              },
                              body: {
                  currency: 'AUD',
                  customer: {
                    payment_source: {
                      gateway_id: '{{gatewayId}}',
                      type: 'card',
                      card_name: 'Wanda Mertz',
                      card_number: '5506900140100305',
                      expire_month: '08',
                      expire_year: '25',
                      card_ccv: '111'
                    }
                  }
                }
            },
            documentation: 'Verifies card details without creating a charge. Useful for card validation.'
          }
        ]
      },

      {
        name: 'Standalone Refund',
        description: 'Create standalone refund without original charge',
        categories: ['charges'],
        primaryCategory: 'charges',
        complexity: 'basic',
        estimatedDuration: '30 seconds',
        useCase: 'Manual refund processing',
        steps: [
          {
            step: 1,
            description: 'Create standalone refund',
            apiCall: {
              method: 'POST',
              url: '{{baseUrl}}/v1/charges/refunds',
              headers: {
                'Content-Type': 'application/json',
                'x-user-secret-key': '{{secretKey}}'
              },
              body: {
                currency: 'AUD',
                amount: '10',
                customer: {
                  payment_source: {
                    type: 'card',
                    gateway_id: '{{gatewayId}}',
                    card_name: 'Wanda Mertz',
                    card_number: '4242424242424242',
                    expire_month: '12',
                    expire_year: '2031',
                    card_ccv: '000'
                  }
                }
              }
            },
            documentation: 'Creates a standalone refund without requiring the original charge ID.'
          }
        ]
      },

      // ===== COMPOSITE FLOWS =====
      {
        name: 'Complete MPGS Payment Flow',
        description: 'Check for existing MPGS gateway or create new one, then create vault token and charge',
        categories: ['charges', 'gateways', 'advanced'],
        primaryCategory: 'charges',
        complexity: 'advanced',
        estimatedDuration: '2 minutes',
        useCase: 'Complete payment processing setup and execution with MPGS gateway, reusing existing gateway if available',
        steps: [
          {
            step: 1,
            description: 'Check if MPGS gateway exists in environment',
            apiCall: {
              method: 'GET',
              url: '{{baseUrl}}/v1/gateways/{{mpgsService}}',
              headers: {
                'Content-Type': 'application/json',
                'x-user-secret-key': '{{secretKey}}'
              }
            },
            documentation: 'Checks if an MPGS gateway already exists in the environment configuration. If it exists, we can reuse it instead of creating a new one.',
            outgoingEdges: [
              {
                targetStep: 2,
                condition: {
                  field: 'response.resource.data._id',
                  operator: 'equals',
                  value: '681b874bb9119f4f421c105d',
                  stepNumber: 1
                },
                label: 'Gateway exists - use existing'
              },
              {
                targetStep: 3,
                isElse: true,
                label: 'Gateway not found - create new'
              }
            ]
          },
          {
            step: 2,
            description: 'Use existing MPGS gateway (skip creation)',
            apiCall: {
              method: 'GET',
              url: '{{baseUrl}}/v1/gateways/{{mpgsService}}',
              headers: {
                'Content-Type': 'application/json',
                'x-user-secret-key': '{{secretKey}}'
              }
            },
            documentation: 'Retrieves the existing MPGS gateway details. This step is executed when a gateway already exists in the environment.',
            outgoingEdges: [
              {
                targetStep: 4,
                label: 'Continue to vault token creation'
              }
            ]
          },
          {
            step: 3,
            description: 'Create new MPGS gateway',
            apiCall: {
              method: 'POST',
              url: '{{baseUrl}}/v1/gateways',
              headers: {
                'Content-Type': 'application/json',
                'x-user-secret-key': '{{secretKey}}'
              },
              body: {
                type: 'mpgs',
                name: 'MPGS Test Gateway',
                mode: 'test',
                credentials: {
                  merchant_id: '{{mpgsMerchantId}}',
                  api_password: '{{mpgsApiPassword}}',
                  api_username: '{{mpgsApiUsername}}'
                },
                settings: {
                  currency: 'AUD',
                  region: 'AU'
                }
              }
            },
            documentation: 'Creates a new MPGS gateway for payment processing. This step is executed when no existing gateway is found.',
            retryConfig: {
              maxAttempts: 3,
              delayMs: 1000,
              backoffMultiplier: 2
            },
            outgoingEdges: [
              {
                targetStep: 4,
                label: 'Continue to vault token creation'
              }
            ]
          },
          {
            step: 4,
            description: 'Create vault token with card data using MPGS gateway',
            apiCall: {
              method: 'POST',
              url: '{{baseUrl}}/v1/vault/payment_sources',
              headers: {
                'Content-Type': 'application/json',
                'x-user-secret-key': '{{secretKey}}'
              },
              body: {
                gateway_id: '{{step2._id || step3._id}}',
                card_name: 'Wanda Mertz',
                card_number: '5123456789012346',
                expire_month: '12',
                expire_year: '27',
                card_ccv: '123',
                vault_type: 'permanent'
              }
            },
            documentation: 'Creates a vault token using either the existing MPGS gateway (step 2) or the newly created gateway (step 3). This tokenizes the card for secure storage.',
            outgoingEdges: [
              {
                targetStep: 5,
                label: 'Continue to charge creation'
              }
            ]
          },
          {
            step: 5,
            description: 'Create charge using MPGS gateway and vault token',
            apiCall: {
              method: 'POST',
              url: '{{baseUrl}}/v1/charges',
              headers: {
                'Content-Type': 'application/json',
                'x-user-secret-key': '{{secretKey}}'
              },
                              body: {
                  amount: '25.00',
                  currency: 'AUD',
                  reference: '{{mpgsReference}}',
                description: 'Charge using MPGS gateway and vault token',
                customer: {
                  first_name: 'Wanda',
                  last_name: 'Mertz',
                  email: 'wanda.mertz@example.com',
                  phone: '+61412345678'
                },
                payment_source: {
                  gateway_id: '{{step2._id || step3._id}}',
                  vault_token: '{{step4.vault_token}}'
                },
                metadata: {
                  flow_type: 'composite_mpgs',
                  gateway_source: '{{step2._id ? "existing" : "new"}}',
                  gateway_id: '{{step2._id || step3._id}}',
                  vault_token_created: '{{step4.vault_token}}'
                }
              }
            },
            documentation: 'Creates a charge using the MPGS gateway (existing or new) and vault token from previous steps. This completes the payment flow.'
          }
        ]
      },

      {
        name: 'Complete Customer Onboarding with Payment',
        description: 'Create customer, vault token, and first charge in one flow',
        categories: ['customers', 'charges', 'advanced'],
        primaryCategory: 'customers',
        complexity: 'advanced',
        estimatedDuration: '2 minutes',
        useCase: 'Complete new customer onboarding with payment processing',
        steps: [
          {
            step: 1,
            description: 'Create customer with card payment source',
            apiCall: {
              method: 'POST',
              url: '{{baseUrl}}/v1/customers',
              headers: {
                'Content-Type': 'application/json',
                'x-user-secret-key': '{{secretKey}}'
              },
              body: {
                first_name: 'Sarah',
                last_name: 'Johnson',
                email: 'sarah.johnson@example.com',
                phone: '+61412345678',
                address: {
                  line1: '123 Business St',
                  city: 'Sydney',
                  state: 'NSW',
                  postcode: '2000',
                  country: 'AU'
                },
                payment_source: {
                  gateway_id: '{{gatewayId}}',
                  card_name: 'Sarah Johnson',
                  card_number: '4242424242424242',
                  expire_month: '12',
                  expire_year: '2025',
                  card_ccv: '123'
                },
                metadata: {
                  onboarding_flow: 'complete',
                  source: 'composite_flow'
                }
              }
            },
            documentation: 'Creates a new customer with card payment source. This is the foundation for the onboarding process.',
            retryConfig: {
              maxAttempts: 3,
              delayMs: 1000,
              backoffMultiplier: 2
            }
          },
          {
            step: 2,
            description: 'Create vault token for future payments',
            apiCall: {
              method: 'POST',
              url: '{{baseUrl}}/v1/vault/payment_sources',
              headers: {
                'Content-Type': 'application/json',
                'x-user-secret-key': '{{secretKey}}'
              },
              body: {
                gateway_id: '{{gatewayId}}',
                card_name: 'Sarah Johnson',
                card_number: '4242424242424242',
                expire_month: '12',
                expire_year: '2025',
                card_ccv: '123',
                vault_type: 'permanent'
              }
            },
            documentation: 'Creates a vault token for secure card storage. This enables future payments without card details.',
            dependsOn: [1]
          },
          {
            step: 3,
            description: 'Create first charge to verify payment source',
            apiCall: {
              method: 'POST',
              url: '{{baseUrl}}/v1/charges',
              headers: {
                'Content-Type': 'application/json',
                'x-user-secret-key': '{{secretKey}}'
              },
                              body: {
                  amount: '1.00',
                  currency: 'AUD',
                  customer_id: '{{step1._id}}',
                  payment_source: {
                    gateway_id: '{{gatewayId}}',
                    vault_token: '{{step2.vault_token}}'
                  },
                  description: 'First charge - payment source verification',
                  reference: '{{onboardingReference}}',
                metadata: {
                  flow_type: 'customer_onboarding',
                  customer_id: '{{step1._id}}',
                  vault_token: '{{step2.vault_token}}'
                }
              }
            },
            documentation: 'Creates a small test charge to verify the payment source works. This completes the customer onboarding.',
            dependsOn: [1, 2]
          }
        ]
      },

      {
        name: 'Complete Subscription Setup Flow',
        description: 'Create customer, vault token, and subscription in one flow',
        categories: ['subscriptions', 'customers', 'advanced'],
        primaryCategory: 'subscriptions',
        complexity: 'advanced',
        estimatedDuration: '2 minutes',
        useCase: 'Complete subscription setup for new customers',
        steps: [
          {
            step: 1,
            description: 'Create customer with card data',
            apiCall: {
              method: 'POST',
              url: '{{baseUrl}}/v1/customers',
              headers: {
                'Content-Type': 'application/json',
                'x-user-secret-key': '{{secretKey}}'
              },
              body: {
                first_name: 'Michael',
                last_name: 'Brown',
                email: 'michael.brown@example.com',
                phone: '+61412345678',
                payment_source: {
                  gateway_id: '{{gatewayId}}',
                  card_name: 'Michael Brown',
                  card_number: '4242424242424242',
                  expire_month: '12',
                  expire_year: '2025',
                  card_ccv: '123'
                }
              }
            },
            documentation: 'Creates a new customer with card payment source for subscription setup.',
            retryConfig: {
              maxAttempts: 3,
              delayMs: 1000,
              backoffMultiplier: 2
            }
          },
          {
            step: 2,
            description: 'Create vault token for subscription',
            apiCall: {
              method: 'POST',
              url: '{{baseUrl}}/v1/vault/payment_sources',
              headers: {
                'Content-Type': 'application/json',
                'x-user-secret-key': '{{secretKey}}'
              },
              body: {
                gateway_id: '{{gatewayId}}',
                card_name: 'Michael Brown',
                card_number: '4242424242424242',
                expire_month: '12',
                expire_year: '2025',
                card_ccv: '123',
                vault_type: 'permanent'
              }
            },
            documentation: 'Creates a vault token for secure subscription billing.',
            dependsOn: [1]
          },
          {
            step: 3,
            description: 'Create subscription with vault token',
            apiCall: {
              method: 'POST',
              url: '{{baseUrl}}/v1/subscriptions',
              headers: {
                'Content-Type': 'application/json',
                'x-user-secret-key': '{{secretKey}}'
              },
              body: {
                amount: '29.99',
                currency: 'AUD',
                reference: 'SUBSCRIPTION_SETUP_001',
                description: 'Premium SaaS Subscription',
                customer: {
                  payment_source: {
                    gateway_id: '{{gatewayId}}',
                    vault_token: '{{step2.vault_token}}'
                  }
                },
                schedule: {
                  frequency: '1',
                  interval: 'month',
                  start_date: '{{startDate}}',
                  end_date: '{{endDate}}'
                },
                metadata: {
                  flow_type: 'subscription_setup',
                  customer_id: '{{step1._id}}',
                  vault_token: '{{step2.vault_token}}'
                }
              }
            },
            documentation: 'Creates a subscription using the vault token from step 2. This completes the subscription setup flow.',
            dependsOn: [1, 2]
          }
        ]
      },

      {
        name: 'Complete 3DS Payment Flow',
        description: 'Create gateway, customer, and 3DS charge in one flow',
        categories: ['3ds', 'charges', 'advanced'],
        primaryCategory: '3ds',
        complexity: 'advanced',
        estimatedDuration: '3 minutes',
        useCase: 'Complete 3DS payment processing with gateway setup',
        steps: [
          {
            step: 1,
            description: 'Create 3DS-enabled gateway',
            apiCall: {
              method: 'POST',
              url: '{{baseUrl}}/v1/gateways',
              headers: {
                'Content-Type': 'application/json',
                'x-user-secret-key': '{{secretKey}}'
              },
              body: {
                type: 'mpgs',
                name: '3DS Test Gateway',
                mode: 'test',
                credentials: {
                  merchant_id: '{{mpgsMerchantId}}',
                  api_password: '{{mpgsApiPassword}}',
                  api_username: '{{mpgsApiUsername}}'
                },
                settings: {
                  currency: 'AUD',
                  region: 'AU',
                  _3ds: {
                    enabled: true,
                    version: '2.1.0'
                  }
                }
              }
            },
            documentation: 'Creates a 3DS-enabled gateway for secure payment processing.',
            retryConfig: {
              maxAttempts: 3,
              delayMs: 1000,
              backoffMultiplier: 2
            }
          },
          {
            step: 2,
            description: 'Create customer with card data',
            apiCall: {
              method: 'POST',
              url: '{{baseUrl}}/v1/customers',
              headers: {
                'Content-Type': 'application/json',
                'x-user-secret-key': '{{secretKey}}'
              },
              body: {
                first_name: 'Emma',
                last_name: 'Wilson',
                email: 'emma.wilson@example.com',
                phone: '+61412345678',
                address: {
                  line1: '456 Secure Ave',
                  city: 'Melbourne',
                  state: 'VIC',
                  postcode: '3000',
                  country: 'AU'
                },
                payment_source: {
                  gateway_id: '{{step1._id}}',
                  card_name: 'Emma Wilson',
                  card_number: '4000002500003155',
                  expire_month: '12',
                  expire_year: '2025',
                  card_ccv: '123'
                }
              }
            },
            documentation: 'Creates a customer with card data using the 3DS gateway.',
            dependsOn: [1]
          },
          {
            step: 3,
            description: 'Create 3DS charge with browser details',
            apiCall: {
              method: 'POST',
              url: '{{baseUrl}}/v1/charges/3ds',
              headers: {
                'Content-Type': 'application/json',
                'x-user-secret-key': '{{secretKey}}'
              },
                              body: {
                  amount: '99.99',
                  currency: 'AUD',
                  customer_id: '{{step2._id}}',
                  payment_source_id: '{{step2.payment_sources[0]._id}}',
                  _3ds: {
                    browser_details: {
                      name: 'CHROME',
                      java_enabled: 'true',
                      language: 'en-US',
                      screen_height: '1080',
                      screen_width: '1920',
                      time_zone: '273',
                      color_depth: '24'
                    }
                  },
                  description: '3DS Authentication Test Charge',
                  reference: '{{3dsReference}}',
                metadata: {
                  flow_type: 'composite_3ds',
                  gateway_id: '{{step1._id}}',
                  customer_id: '{{step2._id}}'
                }
              }
            },
            documentation: 'Creates a 3DS charge using the gateway and customer from previous steps. This completes the 3DS payment flow.',
            dependsOn: [1, 2]
          }
        ]
      }
    ];
  }

  getFlowTemplateByName(name: string): FlowTemplate | null {
    return this.getFlowTemplates().find(template => template.name === name) || null;
  }

  getFlowTemplatesByCategory(category: string): FlowTemplate[] {
    return this.getFlowTemplates().filter(template =>
      template.categories.includes(category as any) || template.primaryCategory === category
    );
  }

  getCategories(): string[] {
    const allCategories = new Set<string>();
    this.getFlowTemplates().forEach(template => {
      template.categories.forEach(cat => allCategories.add(cat));
    });
    return Array.from(allCategories).sort();
  }

  getFlowTemplatesByPrimaryCategory(category: string): FlowTemplate[] {
    return this.getFlowTemplates().filter(template => template.primaryCategory === category);
  }

  getTemplatesByComplexity(complexity: 'basic' | 'intermediate' | 'advanced'): FlowTemplate[] {
    return this.getFlowTemplates().filter(template => template.complexity === complexity);
  }

  substituteVariables(flow: FlowTemplate, variables: Record<string, string>): FlowTemplate {
    // Calculate a future year that ensures cards never expire (current year + 10 years)
    const currentYear = new Date().getFullYear();
    const futureYear = (currentYear + 10).toString();

    const substitute = (value: string): string => {
      // Special handling for expire_year to ensure it's always in the future
      if (value === 'expire_year') {
        return futureYear;
      }
      return value.replace(/\{\{(\w+)\}\}/g, (match, key) => variables[key] || match);
    };

    const substituteObject = (obj: any): any => {
      if (typeof obj === 'string') {
        return substitute(obj);
      }
      if (Array.isArray(obj)) {
        return obj.map(substituteObject);
      }
      if (obj && typeof obj === 'object') {
        const result: any = {};
        for (const [key, value] of Object.entries(obj)) {
          // Special handling for expire_year field
          if (key === 'expire_year' && typeof value === 'string') {
            // If it's a 2-digit year, convert to 4-digit future year
            if (value.length === 2) {
              const yearPrefix = currentYear.toString().substring(0, 2);
              const twoDigitYear = parseInt(value);
              const fullYear = parseInt(yearPrefix + value);

              // If the calculated year is in the past, use future year
              if (fullYear < currentYear) {
                result[key] = futureYear.substring(2); // Return 2-digit format
              } else {
                result[key] = value; // Keep original if it's already future
              }
            } else {
              // If it's a 4-digit year, ensure it's in the future
              const yearNum = parseInt(value);
              if (yearNum < currentYear) {
                result[key] = futureYear;
              } else {
                result[key] = value;
              }
            }
          } else {
            result[key] = substituteObject(value);
          }
        }
        return result;
      }
      return obj;
    };

    return {
      ...flow,
      steps: flow.steps.map(step => ({
        ...step,
        apiCall: step.apiCall ? {
          ...step.apiCall,
          url: substitute(step.apiCall.url),
          headers: substituteObject(step.apiCall.headers),
          body: step.apiCall.body ? substituteObject(step.apiCall.body) : undefined
        } : undefined
      }))
    };
  }
}
