/**
 * GENERATED FILE - DO NOT EDIT.
 * Source: contracts/ (the schema of record). Regenerate with `npm run codegen`.
 * The codegen-drift gate fails the build if this file differs from its source.
 */
/* eslint-disable */
export const CONTROL_PLANE_OPENAPI_DOCUMENT = {
  "openapi": "3.1.0",
  "info": {
    "title": "JazzTicketing Control Plane (Jazzware-internal)",
    "version": "0.1.0",
    "description": "THE INTERNAL SURFACE, AND A DELIBERATELY SEPARATE DOCUMENT.\n\nFR-1 puts Tenant creation on \"a Jazzware-internal function on a surface the product does not link to\", reachable by no hotel-side role, and AD-4 puts the control plane outside the regional cells. `contracts/openapi.yaml` describes a cell; this describes the control plane. Keeping them apart in the schema of record is what makes FR-1's \"provisioning grants Jazzware no standing access to tenant data\" enforceable rather than a promise — an operator credential is not merely unauthorised against a cell, it addresses a different surface with a different issuer and a different audience, and the test suite asserts the two documents share no path.\n\nNOTHING HERE IS BUILT. Every operation carries `x-story` and `x-implemented: false`, on the same terms as the auth surface in the cell document — see `docs/decisions/0002`. Epic 11 builds the operator surface in R1, because Story 1.1 cannot run without it."
  },
  "servers": [
    {
      "url": "/control/v1",
      "description": "The control plane. Never a cell, and never served on a cell's origin."
    }
  ],
  "tags": [
    {
      "name": "operator-auth",
      "description": "How a Jazzware operator signs in. FR-86, Story 11.1."
    },
    {
      "name": "operator-accounts",
      "description": "Who the operators are. FR-86, Story 11.2."
    },
    {
      "name": "operator-audit",
      "description": "What an operator did. FR-86, Story 11.3."
    },
    {
      "name": "provisioning",
      "description": "Creating a customer, and asking for time-boxed access to one. FR-1, owned by Story 1.1 — which is in Epic 1, not Epic 11, because the provisioning behaviour is specified there. Only the surface is internal."
    }
  ],
  "security": [
    {
      "operatorBearerAuth": []
    }
  ],
  "paths": {
    "/operator/sign-in": {
      "post": {
        "operationId": "operatorSignIn",
        "tags": [
          "operator-auth"
        ],
        "x-story": "11.1",
        "x-implemented": false,
        "security": [],
        "summary": "Sign in as a Jazzware operator.",
        "description": "Yields a session scoped to provisioning actions only. It grants NO read of any Tenant's operational or guest data — not reduced access, none — and the refusal is server-side against a crafted payload rather than an interface that hides things (Story 11.1 AC-1, AD-11).\n\nA hotel-side identity presented here is refused, and the response reveals nothing about whether that identity exists. Second factors follow FR-84 and FR-85 exactly as for a tenant user: off by default, the operator's own to enable, and available to be required across the operator organisation by the same enforcement setting. Jazzware's security policy decides whether to switch it on; this contract does not decide it for them.",
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/OperatorSignInRequest"
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "an operator session, or a second-factor challenge",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/OperatorSignInResult"
                }
              }
            }
          },
          "400": {
            "$ref": "#/components/responses/Error"
          },
          "401": {
            "$ref": "#/components/responses/Error"
          },
          "429": {
            "$ref": "#/components/responses/TooManyAttempts"
          },
          "501": {
            "$ref": "#/components/responses/NotImplemented"
          }
        }
      }
    },
    "/operator/session": {
      "get": {
        "operationId": "getOperatorSession",
        "tags": [
          "operator-auth"
        ],
        "x-story": "11.1",
        "x-implemented": false,
        "summary": "Who this operator is, and what the session may do.",
        "description": "The operator counterpart of the cell's `/auth/session`, and deliberately a much smaller thing: provisioning scope, no Tenant, no Property, no guest data of any kind (AD-4, DG-1).",
        "responses": {
          "200": {
            "description": "the operator session",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/OperatorSession"
                }
              }
            }
          },
          "401": {
            "$ref": "#/components/responses/Error"
          },
          "501": {
            "$ref": "#/components/responses/NotImplemented"
          }
        }
      }
    },
    "/operator/sign-out": {
      "post": {
        "operationId": "operatorSignOut",
        "tags": [
          "operator-auth"
        ],
        "x-story": "11.1",
        "x-implemented": false,
        "summary": "End this operator session.",
        "responses": {
          "204": {
            "description": "session ended"
          },
          "401": {
            "$ref": "#/components/responses/Error"
          },
          "501": {
            "$ref": "#/components/responses/NotImplemented"
          }
        }
      }
    },
    "/operator/accounts": {
      "get": {
        "operationId": "listOperatorAccounts",
        "tags": [
          "operator-accounts"
        ],
        "x-story": "11.2",
        "x-implemented": false,
        "summary": "The operator accounts that exist.",
        "description": "Requires operator-ADMINISTRATOR scope, which is distinct from operator scope — otherwise every operator can create more operators (Story 11.2).",
        "responses": {
          "200": {
            "description": "operator accounts, active and deactivated",
            "content": {
              "application/json": {
                "schema": {
                  "type": "array",
                  "items": {
                    "$ref": "#/components/schemas/OperatorAccount"
                  }
                }
              }
            }
          },
          "401": {
            "$ref": "#/components/responses/Error"
          },
          "403": {
            "$ref": "#/components/responses/Error"
          },
          "501": {
            "$ref": "#/components/responses/NotImplemented"
          }
        }
      },
      "post": {
        "operationId": "createOperatorAccount",
        "tags": [
          "operator-accounts"
        ],
        "x-story": "11.2",
        "x-implemented": false,
        "summary": "Create an operator account.",
        "description": "Provisioning scope only, no access to Tenant data, attributed to the acting operator administrator.\n\nTHERE IS NO SIGN-UP ROUTE IN THIS DOCUMENT, deliberately and permanently. A self-service sign-up on the internal surface is a way to mint a Tenant-creating account from the internet. The FIRST account comes from the platform secret store as part of deployment and must have its credential changed on first use (Story 11.2 AC-2) — it is not created here, because at that moment nobody is authenticated to create it.",
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/CreateOperatorAccountRequest"
              }
            }
          }
        },
        "responses": {
          "201": {
            "description": "the account, and an invitation to set a credential",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/OperatorAccount"
                }
              }
            }
          },
          "400": {
            "$ref": "#/components/responses/Error"
          },
          "401": {
            "$ref": "#/components/responses/Error"
          },
          "403": {
            "$ref": "#/components/responses/Error"
          },
          "409": {
            "$ref": "#/components/responses/Error"
          },
          "501": {
            "$ref": "#/components/responses/NotImplemented"
          }
        }
      }
    },
    "/operator/accounts/{operatorId}/deactivate": {
      "post": {
        "operationId": "deactivateOperatorAccount",
        "tags": [
          "operator-accounts"
        ],
        "x-story": "11.2",
        "x-implemented": false,
        "summary": "Deactivate an operator account.",
        "description": "DEACTIVATE, NEVER DELETE. Sign-in is blocked and existing sessions end at next validation, on FR-3's terms for a deprovisioned tenant identity, and the row is retained — an operator audit trail that references a deleted actor is an audit trail with holes in it (Story 11.3).",
        "parameters": [
          {
            "name": "operatorId",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ],
        "responses": {
          "204": {
            "description": "deactivated; sessions end at next validation"
          },
          "401": {
            "$ref": "#/components/responses/Error"
          },
          "403": {
            "$ref": "#/components/responses/Error"
          },
          "404": {
            "$ref": "#/components/responses/Error"
          },
          "501": {
            "$ref": "#/components/responses/NotImplemented"
          }
        }
      }
    },
    "/operator/audit": {
      "get": {
        "operationId": "readOperatorAudit",
        "tags": [
          "operator-audit"
        ],
        "x-story": "11.3",
        "x-implemented": false,
        "summary": "What operators did, where a customer's audit trail is not.",
        "description": "The counterpart of the Tenant audit trail (FR-6), for internal activity: operator sign-ins, Tenant creations, operator-account changes and support-access requests. Append-only, enforced by revoking UPDATE and DELETE for the writing role rather than by an application rule a later migration can relax.\n\nCarries no guest-identifying data, because the control plane holds none — asserted over the whole schema, not just this table (AD-4, AD-10, DG-1).",
        "parameters": [
          {
            "name": "since",
            "in": "query",
            "required": false,
            "schema": {
              "type": "string",
              "format": "date-time"
            }
          },
          {
            "name": "limit",
            "in": "query",
            "required": false,
            "schema": {
              "type": "integer",
              "minimum": 1,
              "maximum": 500
            }
          }
        ],
        "responses": {
          "200": {
            "description": "operator audit entries, newest first",
            "content": {
              "application/json": {
                "schema": {
                  "type": "array",
                  "items": {
                    "$ref": "#/components/schemas/OperatorAuditEntry"
                  }
                }
              }
            }
          },
          "401": {
            "$ref": "#/components/responses/Error"
          },
          "403": {
            "$ref": "#/components/responses/Error"
          },
          "501": {
            "$ref": "#/components/responses/NotImplemented"
          }
        }
      }
    },
    "/tenants": {
      "post": {
        "operationId": "createTenant",
        "tags": [
          "provisioning"
        ],
        "x-story": "1.1",
        "x-implemented": false,
        "summary": "Create a Tenant and its first administrator.",
        "description": "Owned by Story 1.1, which specifies the behaviour; it appears in THIS document rather than the cell's because the surface is internal (FR-1). No hotel-side role can reach it, including a tenant administrator, and the product presents no link to it.\n\nSeeds the shipped role set and platform defaults, and creates **no Properties and no identity connection** — those are the customer's to configure. The first administrator receives an invitation granting tenant-administrator scope only, redeemed in the CELL at `/auth/credential/set-up` (Story 1.3), so the two stories must agree the token's shape.",
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/CreateTenantRequest"
              }
            }
          }
        },
        "responses": {
          "201": {
            "description": "the Tenant, and the region its Properties will live in",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Tenant"
                }
              }
            }
          },
          "400": {
            "$ref": "#/components/responses/Error"
          },
          "401": {
            "$ref": "#/components/responses/Error"
          },
          "403": {
            "$ref": "#/components/responses/Error"
          },
          "409": {
            "$ref": "#/components/responses/Error"
          },
          "501": {
            "$ref": "#/components/responses/NotImplemented"
          }
        }
      }
    },
    "/tenants/{tenantId}/support-access": {
      "post": {
        "operationId": "requestSupportAccess",
        "tags": [
          "provisioning"
        ],
        "x-story": "1.1",
        "x-implemented": false,
        "summary": "Request time-boxed access to a Tenant's data.",
        "description": "The ONLY route by which Jazzware reaches customer data, and it is a request rather than a capability: separately requested, time-boxed, and recorded in that Tenant's OWN audit trail as well as the operator trail (FR-1, Story 1.1 AC-3, Story 11.3 AC-3). A grant visible only to Jazzware is exactly the failure FR-1 exists to prevent.\n\nReturns 202: the request is recorded, and the grant becomes effective under the approval rules Story 1.1 specifies rather than because it was asked for.",
        "parameters": [
          {
            "name": "tenantId",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/SupportAccessRequest"
              }
            }
          }
        },
        "responses": {
          "202": {
            "description": "request recorded on both audit trails",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/SupportAccessGrant"
                }
              }
            }
          },
          "400": {
            "$ref": "#/components/responses/Error"
          },
          "401": {
            "$ref": "#/components/responses/Error"
          },
          "403": {
            "$ref": "#/components/responses/Error"
          },
          "404": {
            "$ref": "#/components/responses/Error"
          },
          "501": {
            "$ref": "#/components/responses/NotImplemented"
          }
        }
      }
    }
  },
  "components": {
    "securitySchemes": {
      "operatorBearerAuth": {
        "type": "http",
        "scheme": "bearer",
        "description": "An OPERATOR token: its own issuer and its own audience, verified on every request, so a token minted here is structurally unusable against a regional cell and a cell token is unusable here. Not a permission check somebody could later widen — a different key. This is the mechanism behind FR-1's \"provisioning grants Jazzware no standing access to tenant data\" and Story 11.1's second acceptance criterion."
      }
    },
    "responses": {
      "Error": {
        "description": "the one error envelope, shared with the cell contract",
        "content": {
          "application/json": {
            "schema": {
              "$ref": "#/components/schemas/ErrorEnvelope"
            }
          }
        }
      },
      "NotImplemented": {
        "description": "Documented but not built yet. `code` is `not_implemented` and `details.story` names the story that owns the operation. Epic 11 is R1 because Story 1.1 cannot run until this surface exists.",
        "content": {
          "application/json": {
            "schema": {
              "$ref": "#/components/schemas/ErrorEnvelope"
            }
          }
        }
      },
      "TooManyAttempts": {
        "description": "Rate-limited. `code` is `too_many_attempts`, `details.retryAfterSeconds` says how long, and it is indistinguishable between a wrong credential and an unknown operator.",
        "content": {
          "application/json": {
            "schema": {
              "$ref": "#/components/schemas/ErrorEnvelope"
            }
          }
        }
      }
    },
    "schemas": {
      "ErrorEnvelope": {
        "type": "object",
        "required": [
          "code",
          "messageKey",
          "retryable"
        ],
        "properties": {
          "code": {
            "type": "string"
          },
          "messageKey": {
            "type": "string"
          },
          "retryable": {
            "type": "boolean"
          },
          "details": {
            "type": "object",
            "additionalProperties": true
          }
        }
      },
      "OperatorSignInRequest": {
        "type": "object",
        "required": [
          "email",
          "password"
        ],
        "properties": {
          "email": {
            "type": "string",
            "format": "email",
            "maxLength": 320
          },
          "password": {
            "type": "string",
            "writeOnly": true,
            "minLength": 12,
            "maxLength": 256
          }
        }
      },
      "OperatorSignInResult": {
        "type": "object",
        "description": "The same two-outcome shape as the cell's `SignInResult`, for the same reason: an operator who enables a second factor (FR-84) must not change the response type every caller already parses.",
        "required": [
          "status"
        ],
        "properties": {
          "status": {
            "type": "string",
            "enum": [
              "authenticated",
              "mfa_required"
            ]
          },
          "token": {
            "allOf": [
              {
                "$ref": "#/components/schemas/OperatorSessionToken"
              }
            ],
            "description": "Present when `status` is `authenticated`."
          },
          "challengeToken": {
            "type": "string",
            "writeOnly": true,
            "description": "Present when `status` is `mfa_required`. Own audience, short lifetime, no scope — never a bearer token."
          }
        }
      },
      "OperatorSessionToken": {
        "type": "object",
        "required": [
          "accessToken",
          "tokenType",
          "expiresInSeconds",
          "session"
        ],
        "properties": {
          "accessToken": {
            "type": "string",
            "description": "Provisioning scope only. Carries no `tenantId` and no `propertyId`, because it is not scoped to a customer — the cell contract's AD-3 rule has no meaning here and its absence is the point."
          },
          "tokenType": {
            "type": "string",
            "enum": [
              "Bearer"
            ]
          },
          "expiresInSeconds": {
            "type": "integer",
            "minimum": 1
          },
          "session": {
            "$ref": "#/components/schemas/OperatorSession"
          }
        }
      },
      "OperatorSession": {
        "type": "object",
        "required": [
          "operatorId",
          "displayName",
          "scopes",
          "expiresAt"
        ],
        "properties": {
          "operatorId": {
            "type": "string"
          },
          "displayName": {
            "type": "string",
            "description": "The operator's own name. Never a guest's",
            "and never a hotel employee's.": null
          },
          "scopes": {
            "type": "array",
            "description": "Provisioning capabilities only — `provision:tenant`, `manage:operators`, `read:operator-audit`, `request:support-access`. Nothing in this list reads customer data.",
            "items": {
              "type": "string"
            }
          },
          "expiresAt": {
            "type": "string",
            "format": "date-time"
          }
        }
      },
      "OperatorAccount": {
        "type": "object",
        "required": [
          "operatorId",
          "email",
          "displayName",
          "scopes",
          "active",
          "createdAt"
        ],
        "properties": {
          "operatorId": {
            "type": "string"
          },
          "email": {
            "type": "string",
            "format": "email"
          },
          "displayName": {
            "type": "string"
          },
          "scopes": {
            "type": "array",
            "items": {
              "type": "string"
            }
          },
          "active": {
            "type": "boolean",
            "description": "False once deactivated. The row is retained for audit."
          },
          "mfaEnrolled": {
            "type": "boolean",
            "description": "Whether this operator has a second factor (FR-84). Off by default."
          },
          "createdAt": {
            "type": "string",
            "format": "date-time"
          },
          "createdBy": {
            "type": "string",
            "description": "The operator administrator who created it."
          }
        }
      },
      "CreateOperatorAccountRequest": {
        "type": "object",
        "required": [
          "email",
          "displayName",
          "scopes"
        ],
        "properties": {
          "email": {
            "type": "string",
            "format": "email",
            "maxLength": 320
          },
          "displayName": {
            "type": "string",
            "maxLength": 120
          },
          "scopes": {
            "type": "array",
            "minItems": 1,
            "items": {
              "type": "string"
            }
          }
        }
      },
      "OperatorAuditEntry": {
        "type": "object",
        "description": "Append-only. Never carries guest-identifying data (AD-4, AD-10, DG-1).",
        "required": [
          "entryId",
          "occurredAt",
          "operatorId",
          "action"
        ],
        "properties": {
          "entryId": {
            "type": "string"
          },
          "occurredAt": {
            "type": "string",
            "format": "date-time"
          },
          "operatorId": {
            "type": "string"
          },
          "action": {
            "type": "string",
            "description": "What happened — an operator sign-in, a Tenant creation, an operator-account change, a support-access request."
          },
          "tenantId": {
            "type": "string",
            "description": "The Tenant an action concerned, where it concerned one. An id, never a guest and never operational data."
          },
          "details": {
            "type": "object",
            "additionalProperties": true
          }
        }
      },
      "CreateTenantRequest": {
        "type": "object",
        "required": [
          "name",
          "firstAdministratorEmail",
          "region"
        ],
        "properties": {
          "name": {
            "type": "string",
            "maxLength": 200
          },
          "firstAdministratorEmail": {
            "type": "string",
            "format": "email",
            "description": "Receives an invitation granting tenant-administrator scope ONLY, redeemed in the cell at `/auth/credential/set-up`."
          },
          "region": {
            "type": "string",
            "description": "Chosen at creation and IMMUTABLE thereafter — a Property never leaves its region (AD-4, DG-4), and the region is stated at sign-in because it is a residency fact."
          }
        }
      },
      "Tenant": {
        "type": "object",
        "required": [
          "tenantId",
          "name",
          "region",
          "active",
          "createdAt"
        ],
        "properties": {
          "tenantId": {
            "type": "string"
          },
          "name": {
            "type": "string"
          },
          "region": {
            "type": "string"
          },
          "active": {
            "type": "boolean",
            "description": "A Tenant with operational records can be deactivated",
            "never deleted (FR-1).": null
          },
          "createdAt": {
            "type": "string",
            "format": "date-time"
          }
        }
      },
      "SupportAccessRequest": {
        "type": "object",
        "required": [
          "reason",
          "requestedMinutes"
        ],
        "properties": {
          "reason": {
            "type": "string",
            "maxLength": 1000,
            "description": "Recorded in the customer's own audit trail",
            "so write it for them to read.": null
          },
          "requestedMinutes": {
            "type": "integer",
            "minimum": 1,
            "maximum": 1440
          }
        }
      },
      "SupportAccessGrant": {
        "type": "object",
        "required": [
          "grantId",
          "tenantId",
          "status",
          "requestedAt",
          "requestedMinutes"
        ],
        "properties": {
          "grantId": {
            "type": "string"
          },
          "tenantId": {
            "type": "string"
          },
          "status": {
            "type": "string",
            "enum": [
              "requested",
              "approved",
              "expired",
              "revoked"
            ]
          },
          "requestedAt": {
            "type": "string",
            "format": "date-time"
          },
          "requestedMinutes": {
            "type": "integer"
          },
          "expiresAt": {
            "type": "string",
            "format": "date-time",
            "description": "Set once approved. Time-boxing is not optional (FR-1)."
          }
        }
      }
    }
  }
} as const;
export const CONTROL_PLANE_OPENAPI_VERSION = "0.1.0";
