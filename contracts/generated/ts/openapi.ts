/**
 * GENERATED FILE - DO NOT EDIT.
 * Source: contracts/ (the schema of record). Regenerate with `npm run codegen`.
 * The codegen-drift gate fails the build if this file differs from its source.
 */
/* eslint-disable */
export const OPENAPI_DOCUMENT = {
  "openapi": "3.1.0",
  "info": {
    "title": "JazzTicketing API",
    "version": "0.1.0",
    "description": "Commands are POSTs returning the accepted event; reads are projections. Every request resolves to exactly one Tenant and Property.\n\nStory 1.0 built the health, docs, SLA-fold and isolation-fixture surfaces. The `auth` operations are DESIGNED HERE AND BUILT LATER: each is marked `x-implemented: false` with an `x-story` naming its owner, and each answers 501 `not_implemented` until that story lands."
  },
  "servers": [
    {
      "url": "/v1",
      "description": "This cell, behind the edge."
    }
  ],
  "tags": [
    {
      "name": "health",
      "description": "Cell health. The only routes that need no credential."
    },
    {
      "name": "docs",
      "description": "The API's own description, served from contracts/ - the schema of record."
    },
    {
      "name": "sla",
      "description": "The one SLA fold (AD-14), exposed so a caller can evaluate it without reimplementing it."
    },
    {
      "name": "auth",
      "description": "Authentication and session. Designed here in full and built across four stories - see the ownership note above the /auth paths."
    },
    {
      "name": "isolation-fixture",
      "description": "Story 1.0's cross-tenant isolation fixture. NOT a domain aggregate and not a preview of the real API - Story 1.1 brings Tenant, Story 3.1 brings Job."
    }
  ],
  "security": [
    {
      "bearerAuth": []
    }
  ],
  "paths": {
    "/health": {
      "get": {
        "operationId": "getHealth",
        "tags": [
          "health"
        ],
        "security": [],
        "summary": "Cell health - API, event store, cache reachability",
        "description": "Never throws and never returns 5xx. A missing DATABASE_URL surfaces here as `eventStore: unreachable` with status `degraded`, because a 500 from health tells the reader nothing except that the thing they asked with is also broken.",
        "responses": {
          "200": {
            "description": "health snapshot",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Health"
                }
              }
            }
          }
        }
      }
    },
    "/openapi.json": {
      "get": {
        "operationId": "getOpenApiDocument",
        "tags": [
          "docs"
        ],
        "security": [],
        "summary": "This document, as JSON",
        "description": "Generated from `contracts/openapi.yaml` at build time and compiled into the artifact, so it cannot drift from the spec the bindings are generated from - the codegen-drift gate fails the build if it does.",
        "responses": {
          "200": {
            "description": "the OpenAPI 3.1 document",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "additionalProperties": true
                }
              }
            }
          }
        }
      }
    },
    "/docs": {
      "get": {
        "operationId": "getApiDocs",
        "tags": [
          "docs"
        ],
        "security": [],
        "summary": "Swagger UI",
        "description": "Self-hosted from `swagger-ui-dist` - no CDN, so it works air-gapped and loads no third-party script into an authenticated origin. Set `API_DOCS=0` to disable, which returns 404.",
        "responses": {
          "200": {
            "description": "an HTML page",
            "content": {
              "text/html": {
                "schema": {
                  "type": "string"
                }
              }
            }
          },
          "404": {
            "description": "docs disabled"
          }
        }
      }
    },
    "/commands/record-fixture-note": {
      "post": {
        "operationId": "recordFixtureNote",
        "tags": [
          "isolation-fixture"
        ],
        "summary": "ISOLATION FIXTURE ONLY. Not a domain aggregate. Story 1.1 brings Tenant, Story 3.1 brings Job. This exists so the cross-tenant isolation gate has a real resource to attack through every public interface.",
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/RecordFixtureNote"
              }
            }
          }
        },
        "responses": {
          "202": {
            "description": "the accepted event",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/AcceptedEvent"
                }
              }
            }
          },
          "400": {
            "$ref": "#/components/responses/Error"
          },
          "401": {
            "$ref": "#/components/responses/Error"
          }
        }
      }
    },
    "/fixture-notes": {
      "get": {
        "operationId": "listFixtureNotes",
        "tags": [
          "isolation-fixture"
        ],
        "parameters": [
          {
            "name": "q",
            "in": "query",
            "required": false,
            "schema": {
              "type": "string"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "projection page",
            "content": {
              "application/json": {
                "schema": {
                  "type": "array",
                  "items": {
                    "$ref": "#/components/schemas/FixtureNote"
                  }
                }
              }
            }
          }
        }
      }
    },
    "/fixture-notes/{id}": {
      "get": {
        "operationId": "getFixtureNote",
        "tags": [
          "isolation-fixture"
        ],
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "one note",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/FixtureNote"
                }
              }
            }
          },
          "404": {
            "$ref": "#/components/responses/Error"
          }
        }
      }
    },
    "/fixture-notes/export": {
      "get": {
        "operationId": "exportFixtureNotes",
        "tags": [
          "isolation-fixture"
        ],
        "responses": {
          "200": {
            "description": "CSV within the caller's scope",
            "content": {
              "text/csv": {
                "schema": {
                  "type": "string"
                }
              }
            }
          }
        }
      }
    },
    "/sla/preview": {
      "post": {
        "operationId": "previewSla",
        "tags": [
          "sla"
        ],
        "summary": "Evaluate the one SLA fold over a supplied event sequence.",
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/SlaPreviewRequest"
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "fold output",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/SlaSnapshot"
                }
              }
            }
          }
        }
      }
    },
    "/auth/session": {
      "get": {
        "operationId": "getSession",
        "tags": [
          "auth"
        ],
        "x-story": "1.3",
        "x-implemented": false,
        "summary": "Who the caller is, where they are scoped, and what they may do.",
        "description": "The single server-side permission decision point that the interface queries (AD-11, Story 1.3 T4). One place answers a permission question; two answers is how a hidden button becomes a security bug. Carries no guest data of any kind (DG-1) and no staff attribute beyond what a session needs.",
        "responses": {
          "200": {
            "description": "the current session",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Session"
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
    "/auth/context": {
      "post": {
        "operationId": "switchContext",
        "tags": [
          "auth"
        ],
        "x-story": "1.3",
        "x-implemented": false,
        "summary": "Switch Property without signing out.",
        "description": "A Staff Member holding roles at two Properties in one Tenant switches context and their permissions are RE-RESOLVED server-side for the new Property (Story 1.3 AC-3). Because every token carries `tenant_id` and `property_id` (AD-3), a switch MINTS A NEW TOKEN rather than reinterpreting the old one - a scope that a header can change is not a scope. The Tenant never changes: a `propertyId` in another Tenant answers `not_found`, not `forbidden`, so the response cannot be used to discover that a Property exists elsewhere. A Property in this Tenant where the caller holds no role answers `forbidden`.",
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/SwitchContextRequest"
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "a new token scoped to the new Property",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/SessionToken"
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
    },
    "/auth/sso/start": {
      "get": {
        "operationId": "startSso",
        "tags": [
          "auth"
        ],
        "x-story": "1.5",
        "x-implemented": false,
        "security": [],
        "summary": "Begin authentication at the Tenant's identity provider.",
        "description": "Resolves the Tenant's SAML 2.0 / OIDC connection and redirects to it. The connection is per Tenant and never global (FR-3), so the Tenant has to be identified before a provider can be chosen; `tenantSlug` is a routing hint, not a credential. An unknown Tenant, and a Tenant with no provider configured, produce the SAME outcome as a rejected assertion - the response never reveals whether a Tenant exists or has SSO connected. `state` is opaque, single-use and bound to the callback. No token, client secret or assertion appears in this or any other query string.",
        "parameters": [
          {
            "name": "tenantSlug",
            "in": "query",
            "required": true,
            "schema": {
              "type": "string",
              "maxLength": 64
            }
          },
          {
            "name": "returnTo",
            "in": "query",
            "required": false,
            "description": "A path within this console, validated server-side against an allowlist. An absolute URL is refused - an open redirect on a sign-in route is how a credential ends up somewhere it was not meant to go.",
            "schema": {
              "type": "string",
              "maxLength": 512
            }
          }
        ],
        "responses": {
          "302": {
            "description": "redirect to the identity provider",
            "headers": {
              "Location": {
                "description": "the provider's authorisation endpoint",
                "schema": {
                  "type": "string"
                }
              }
            }
          },
          "400": {
            "$ref": "#/components/responses/Error"
          },
          "501": {
            "$ref": "#/components/responses/NotImplemented"
          }
        }
      }
    },
    "/auth/sso/callback": {
      "post": {
        "operationId": "completeSso",
        "tags": [
          "auth"
        ],
        "x-story": "1.5",
        "x-implemented": false,
        "security": [],
        "summary": "Exchange an OIDC code or a SAML assertion for a session.",
        "description": "AUTHENTICATION IS NOT AUTHORISATION. Just-in-time provisioning is off by default (FR-83), so an identity that authenticates successfully but matches no provisioned Staff Member gets `forbidden` and NO SESSION - not a session holding an empty permission set, which every client would then have to remember to handle. A provider connected for Tenant A never authenticates a Tenant B user. The code and the assertion arrive in the body and are never logged.",
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/SsoCallbackRequest"
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "a session",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/SessionToken"
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
          "501": {
            "$ref": "#/components/responses/NotImplemented"
          }
        }
      }
    },
    "/auth/credential/set-up": {
      "post": {
        "operationId": "setUpCredential",
        "tags": [
          "auth"
        ],
        "x-story": "1.3",
        "x-implemented": false,
        "security": [],
        "summary": "Redeem an invitation and set a password.",
        "description": "The other end of Story 1.3's \"an invitation with an email address issues a credential set-up link\", and of Story 1.1's first-administrator invitation. Returns a session, because the holder has just proved control of the mailbox the invitation was sent to and there is no earlier session to protect - for a first administrator on a brand-new Tenant, making them sign in again immediately buys nothing.\n\nSEQUENCING: Story 1.1 issues the first invitation and Story 1.3 redeems it, so the two must agree the token's shape before either starts - the same arrangement 4.1 and 4.3 have over the offline queue. Between them a provisioned Tenant has an administrator who cannot yet sign in.\n\nThe token is single-use and short-lived. Every rejection - unknown, expired, already used - is one generic `validation_failed`, so the endpoint cannot be used to learn that an invitation existed.",
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/CredentialSetUpRequest"
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "the credential is set, and this is the session",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/SessionToken"
                }
              }
            }
          },
          "400": {
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
    "/auth/sign-in": {
      "post": {
        "operationId": "signIn",
        "tags": [
          "auth"
        ],
        "x-story": "1.3",
        "x-implemented": false,
        "security": [],
        "summary": "Sign in with an email address and a password.",
        "description": "The documented fallback for corporate and management users whose Tenant has not connected an identity provider. Where a Tenant HAS connected one, this is refused for identities that provider governs - otherwise connecting SSO would leave a second, weaker door open beside it, and FR-3's promise that a deprovisioned identity loses access would be worth nothing.\n\nOne generic failure for every rejection - unknown address, wrong password, disabled account, an address governed by a connected provider - so the screen cannot be used to discover who has an account or which Tenants use SSO. Rate-limited per address and per source. Never logs the password, and never accepts it in a query string.\n\nThe response's `session.switchableProperties` is what the property picker on this surface renders; a caller with one Property gets one entry and the picker does not appear.",
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/SignInRequest"
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "A session, or - once Story 12.2 lands - a second-factor challenge. One response type either way: `status` discriminates, so making MFA reachable changes no caller's parsing (FR-84).",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/SignInResult"
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
            "description": "The Tenant requires MFA (FR-85) and this Staff Member has no enrolled factor, past the grace period. The password was correct, so this response names enrolment as the missing piece - which is safe precisely because the caller has already proved the credential (Story 12.4 AC-4).",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ErrorEnvelope"
                }
              }
            }
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
    "/auth/password/forgot": {
      "post": {
        "operationId": "requestPasswordReset",
        "tags": [
          "auth"
        ],
        "x-story": "1.3",
        "x-implemented": false,
        "security": [],
        "summary": "Ask for a password reset link.",
        "description": "OPEN QUESTION, DESIGNED NO FURTHER THAN THE SHAPE. No FR covers credential recovery - it is a gap raised against the PRD, not a decision taken here - and Story 1.3's acceptance criteria do not currently require it. What is undecided is the policy: whether self-service reset is permitted at all for an administrator, or whether recovery goes through a Jazzware support request. It matters because an administrator locked out of a Tenant with no identity connection has no other way in, and because a self-service reset on an account without a second factor is a password-reset takeover. **Settle it in epics.md before building this.**\n\nThe shape itself is not in doubt: **always 202**, whether or not the address exists, whether or not it is governed by SSO. A response that differs is an account-enumeration oracle, and this is the one endpoint on the product that anyone can call.",
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/PasswordForgotRequest"
              }
            }
          }
        },
        "responses": {
          "202": {
            "description": "accepted - and says nothing about whether the address exists"
          },
          "400": {
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
    "/auth/password/reset": {
      "post": {
        "operationId": "resetPassword",
        "tags": [
          "auth"
        ],
        "x-story": "1.3",
        "x-implemented": false,
        "security": [],
        "summary": "Set a new password from a reset token.",
        "description": "Governed by the same open question as `/auth/password/forgot`.\n\nReturns **204 and no session**, unlike credential set-up, and REVOKES EVERY OTHER SESSION for that Staff Member. The asymmetry is deliberate: a set-up is a first arrival with nothing to protect, while a reset may be the response to a credential already in someone else's hands, so it has to end the sessions that credential could have opened - including on any Shared Device. The holder signs in again through `/auth/sign-in`, which is also the only way they learn the new password works.\n\nToken single-use and short-lived, delivered in a URL fragment and submitted in this body. One generic `validation_failed` for unknown, expired and already-used alike.",
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/PasswordResetRequest"
              }
            }
          }
        },
        "responses": {
          "204": {
            "description": "password set; every other session for this Staff Member is revoked"
          },
          "400": {
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
    "/auth/token/refresh": {
      "post": {
        "operationId": "refreshToken",
        "tags": [
          "auth"
        ],
        "x-story": "1.5",
        "x-implemented": false,
        "security": [],
        "summary": "Exchange a refresh token for a new short-lived access token.",
        "description": "This is the mechanism behind \"access is lost at next token validation, without a manual step in JazzTicketing\" (Story 1.5 AC-2): upstream state is re-checked HERE. Access tokens are therefore deliberately short-lived, and the refresh is where deprovisioning bites. A deprovisioned, disabled or revoked identity gets `unauthenticated` and the refresh token is burned. Rotation is single-use - presenting the same refresh token twice invalidates the whole session chain, because a replay means the token is no longer in only one place. Body, never a URL; never logged.",
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/RefreshRequest"
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "a new access token, and a new refresh token replacing the one presented",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/SessionToken"
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
          "501": {
            "$ref": "#/components/responses/NotImplemented"
          }
        }
      }
    },
    "/auth/device/sign-in": {
      "post": {
        "operationId": "signInOnSharedDevice",
        "tags": [
          "auth"
        ],
        "x-story": "4.1",
        "x-implemented": false,
        "security": [],
        "summary": "Sign in on a Shared Device with a PIN or a badge.",
        "description": "Under five seconds on the baseline device (Story 4.1 AC-1, NFR-5), with the Staff Member's configured language applied immediately (FR-61). The capability limit lives on the CREDENTIAL, not on the role: a session minted from a PIN or a badge is refused configuration and reporting scopes even when the Staff Member also holds an administrator role (FR-4, Story 1.3 T2), so a PIN-holding administrator is not a hole. Every rejection - unknown staff reference, wrong PIN, disabled credential, unregistered device - returns one generic failure, so the sign-in screen cannot be used to enumerate staff. Rate-limited per device and per staff reference.",
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/DeviceSignInRequest"
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "a session scoped to the device's Property",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/SessionToken"
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
    "/auth/sign-out": {
      "post": {
        "operationId": "signOut",
        "tags": [
          "auth"
        ],
        "x-story": "4.1",
        "x-implemented": false,
        "summary": "End this session on this device.",
        "description": "Revokes THIS session and nothing else. Queued offline actions belonging to the signing-out Staff Member survive and later sync under their identity (Story 4.1 AC-2 and AC-4, AD-7) - sign-out is not a wipe, and idempotency is keyed to `(tenant_id, property_id, staff_member_id, client_key)`, so the next person on the handset cannot collide with the last. What must LEAVE the device on sign-out is guest context, and that is Story 4.8.",
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
    "/auth/sessions": {
      "get": {
        "operationId": "listDeviceSessions",
        "tags": [
          "auth"
        ],
        "x-story": "4.8",
        "x-implemented": false,
        "summary": "Sessions currently open on this Property's devices.",
        "description": "Device and session hygiene (FR-64): an administrator can see which handsets hold a live session in order to end one. Scoped to the caller's Property. It carries a device label and a Staff Member id and never a guest name or Stay context (DG-1).",
        "responses": {
          "200": {
            "description": "open sessions within the caller's scope",
            "content": {
              "application/json": {
                "schema": {
                  "type": "array",
                  "items": {
                    "$ref": "#/components/schemas/DeviceSession"
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
    "/auth/sessions/{sessionId}": {
      "delete": {
        "operationId": "revokeDeviceSession",
        "tags": [
          "auth"
        ],
        "x-story": "4.8",
        "x-implemented": false,
        "summary": "Remote sign-out for one device session.",
        "description": "The session is marked invalid immediately; the device learns AT NEXT CONTACT (Story 4.8 AC-3). A handset offline for a shift stays signed in - the connectivity model cannot deliver a stronger guarantee and the story accepts that. Hence 202 and not 204: the server has accepted the revocation, it has not confirmed the device acted on it. Reporting otherwise would be the more comfortable lie.",
        "parameters": [
          {
            "name": "sessionId",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ],
        "responses": {
          "202": {
            "description": "revocation accepted; the device is signed out at next contact"
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
    "/auth/mfa": {
      "get": {
        "operationId": "listMyFactors",
        "tags": [
          "auth"
        ],
        "x-story": "12.1",
        "x-implemented": false,
        "summary": "The second factors enrolled on my own account.",
        "description": "Never returns a secret - a TOTP secret is shown once, at enrolment, and is not retrievable afterwards. Returns only what a Settings surface needs to show: which methods exist, when each was enrolled, and which was last used.",
        "responses": {
          "200": {
            "description": "my factors",
            "content": {
              "application/json": {
                "schema": {
                  "type": "array",
                  "items": {
                    "$ref": "#/components/schemas/MfaFactor"
                  }
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
    "/auth/mfa/enrolment": {
      "post": {
        "operationId": "startMfaEnrolment",
        "tags": [
          "auth"
        ],
        "x-story": "12.1",
        "x-implemented": false,
        "summary": "Begin enrolling a second factor.",
        "description": "Returns an INACTIVE factor. For `totp` it carries the `otpauth://` URI once and never again; for `email_otp` it sends a code and carries nothing. The factor does not protect the account until `/auth/mfa/enrolment/verify` succeeds - which is what stops a mis-scanned QR code from locking a Staff Member out of their own account (Story 12.1 AC-3).",
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/StartMfaEnrolmentRequest"
              }
            }
          }
        },
        "responses": {
          "201": {
            "description": "an inactive factor, awaiting verification",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/MfaEnrolment"
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
          "409": {
            "$ref": "#/components/responses/Error"
          },
          "501": {
            "$ref": "#/components/responses/NotImplemented"
          }
        }
      }
    },
    "/auth/mfa/enrolment/verify": {
      "post": {
        "operationId": "verifyMfaEnrolment",
        "tags": [
          "auth"
        ],
        "x-story": "12.1",
        "x-implemented": false,
        "summary": "Activate a factor by proving it works.",
        "description": "A code the new method actually produced. Only this activates the factor. A TOTP code accepted here is burned for the rest of its window, so a code read over someone's shoulder is not usable for its remaining seconds.",
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/VerifyMfaEnrolmentRequest"
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "the factor is active",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/MfaFactor"
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
    "/auth/mfa/{factorId}": {
      "delete": {
        "operationId": "removeMyFactor",
        "tags": [
          "auth"
        ],
        "x-story": "12.3",
        "x-implemented": false,
        "summary": "Remove a second factor from my own account.",
        "description": "Attributed in the audit trail. If this is my last factor and my Tenant requires MFA (FR-85), the response says enrolment of another is required before I can continue - a Staff Member mid-replacement is in the same state as an unenrolled one, not a state of its own (Story 12.3 AC-1).",
        "parameters": [
          {
            "name": "factorId",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ],
        "responses": {
          "204": {
            "description": "removed"
          },
          "401": {
            "$ref": "#/components/responses/Error"
          },
          "404": {
            "$ref": "#/components/responses/Error"
          },
          "409": {
            "description": "Removing this factor would leave the account unable to sign in under the Tenant's MFA requirement. `code` is `conflict`.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ErrorEnvelope"
                }
              }
            }
          },
          "501": {
            "$ref": "#/components/responses/NotImplemented"
          }
        }
      }
    },
    "/auth/mfa/challenge/verify": {
      "post": {
        "operationId": "verifyMfaChallenge",
        "tags": [
          "auth"
        ],
        "x-story": "12.2",
        "x-implemented": false,
        "security": [],
        "summary": "Complete a sign-in challenge and receive a session.",
        "description": "THE CHALLENGE TOKEN IS NOT A HALF-SESSION. It travels in this body, never as a bearer token, and it is minted with its own audience, a short lifetime and no scope - so presenting it to any other endpoint is refused. A \"half-authenticated\" token that ordinary handlers accept is an authentication bypass with extra steps, and Story 12.2 carries a test for exactly that.\n\nThe caller has already proved the password, so a failure here may tell THEM what is wrong. It tells an unauthenticated caller nothing.",
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/VerifyMfaChallengeRequest"
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "a session",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/SessionToken"
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
    "/auth/mfa/challenge/resend": {
      "post": {
        "operationId": "resendMfaChallengeCode",
        "tags": [
          "auth"
        ],
        "x-story": "12.2",
        "x-implemented": false,
        "security": [],
        "summary": "Reissue the email one-time code for a live challenge.",
        "description": "`email_otp` only - there is nothing to resend for TOTP. Reissuing INVALIDATES the previous code, so two codes are never live at once, and it does not extend the challenge's own lifetime. Rate-limited, because this is an endpoint that sends mail on an unauthenticated caller's say-so.",
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/ResendMfaChallengeRequest"
              }
            }
          }
        },
        "responses": {
          "202": {
            "description": "a new code has been sent, and the previous one no longer works"
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
    "/auth/staff/{staffMemberId}/mfa/reset": {
      "post": {
        "operationId": "resetStaffMfa",
        "tags": [
          "auth"
        ],
        "x-story": "12.3",
        "x-implemented": false,
        "summary": "Clear a Staff Member's second factors so they can enrol again.",
        "description": "RESET MEANS RE-ENROL, NOT BYPASS. The administrator clears the factors and the Staff Member enrols again; the administrator never obtains a working second factor for someone else's account, because that would make every administrator a way around MFA. Nothing in the response carries a secret or a code.\n\nEnds the Staff Member's other sessions, because the threat model for a lost phone includes a session already open on it - the same revocation Story 4.8 uses, not a second mechanism.",
        "parameters": [
          {
            "name": "staffMemberId",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ],
        "responses": {
          "204": {
            "description": "factors cleared; the Staff Member's other sessions are revoked"
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
      "bearerAuth": {
        "type": "http",
        "scheme": "bearer",
        "description": "STORY 1.0 ONLY - a fixture auth stub, gated behind `FIXTURE_AUTH=1` so it cannot ship enabled. The token is an HMAC-signed `{tenantId, propertyId, staffMemberId}`, and what it exists to exercise is the TENANCY RESOLUTION BOUNDARY, not the credential. The real thing is already designed - see the `auth` tag, whose operations are marked `x-implemented: false` - and Story 1.3 brings both the password fallback and PIN provisioning, Story 4.1 signs in with a PIN or badge, Story 1.5 connects the Tenant identity provider. Story 1.3 is where this stub's production path is first replaced; 1.5 removes the last of it."
      }
    },
    "responses": {
      "Error": {
        "description": "the one error envelope",
        "content": {
          "application/json": {
            "schema": {
              "$ref": "#/components/schemas/ErrorEnvelope"
            }
          }
        }
      },
      "NotImplemented": {
        "description": "Documented but not built yet. `code` is `not_implemented` and `details.story` names the story that owns the operation. The edge derives these from this document, so an operation cannot be advertised as built while no handler exists behind it.",
        "content": {
          "application/json": {
            "schema": {
              "$ref": "#/components/schemas/ErrorEnvelope"
            }
          }
        }
      },
      "TooManyAttempts": {
        "description": "Rate-limited. `code` is `too_many_attempts` and `details.retryAfterSeconds` says how long. Deliberately indistinguishable between a wrong PIN and an unknown staff reference, so it cannot be used to enumerate staff.",
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
      "Health": {
        "type": "object",
        "required": [
          "status",
          "api",
          "eventStore",
          "cache",
          "cell"
        ],
        "properties": {
          "status": {
            "type": "string",
            "enum": [
              "ok",
              "degraded"
            ]
          },
          "api": {
            "type": "string",
            "enum": [
              "ok"
            ]
          },
          "eventStore": {
            "type": "string",
            "enum": [
              "ok",
              "unreachable"
            ]
          },
          "cache": {
            "type": "string",
            "enum": [
              "ok",
              "unreachable"
            ]
          },
          "cell": {
            "type": "string"
          }
        }
      },
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
      "RecordFixtureNote": {
        "type": "object",
        "required": [
          "text"
        ],
        "properties": {
          "text": {
            "type": "string",
            "maxLength": 280
          },
          "clientKey": {
            "type": "string",
            "description": "idempotency key (AD-7)"
          }
        }
      },
      "AcceptedEvent": {
        "type": "object",
        "required": [
          "eventId",
          "type",
          "occurredAt",
          "recordedAt",
          "tenantId",
          "propertyId"
        ],
        "properties": {
          "eventId": {
            "type": "string"
          },
          "type": {
            "type": "string"
          },
          "occurredAt": {
            "type": "string",
            "format": "date-time"
          },
          "recordedAt": {
            "type": "string",
            "format": "date-time"
          },
          "tenantId": {
            "type": "string"
          },
          "propertyId": {
            "type": "string"
          }
        }
      },
      "FixtureNote": {
        "type": "object",
        "required": [
          "id",
          "text",
          "tenantId",
          "propertyId",
          "recordedAt"
        ],
        "properties": {
          "id": {
            "type": "string"
          },
          "text": {
            "type": "string"
          },
          "tenantId": {
            "type": "string"
          },
          "propertyId": {
            "type": "string"
          },
          "recordedAt": {
            "type": "string",
            "format": "date-time"
          }
        }
      },
      "SlaPreviewRequest": {
        "type": "object",
        "required": [
          "events",
          "targetMinutes",
          "now"
        ],
        "properties": {
          "events": {
            "type": "array",
            "items": {
              "$ref": "#/components/schemas/JobClockEvent"
            }
          },
          "targetMinutes": {
            "type": "integer",
            "minimum": 1
          },
          "now": {
            "type": "string",
            "format": "date-time"
          }
        }
      },
      "JobClockEvent": {
        "type": "object",
        "required": [
          "type",
          "occurredAt"
        ],
        "properties": {
          "type": {
            "type": "string",
            "enum": [
              "JobLogged",
              "JobCompleted"
            ]
          },
          "occurredAt": {
            "type": "string",
            "format": "date-time"
          }
        }
      },
      "SlaSnapshot": {
        "type": "object",
        "required": [
          "elapsedMs",
          "pausedMs",
          "remainingMs",
          "breached",
          "foldVersion"
        ],
        "properties": {
          "elapsedMs": {
            "type": "integer"
          },
          "pausedMs": {
            "type": "integer"
          },
          "remainingMs": {
            "type": "integer"
          },
          "breached": {
            "type": "boolean"
          },
          "foldVersion": {
            "type": "integer"
          }
        }
      },
      "Session": {
        "type": "object",
        "description": "What the server has DECIDED about this caller. No guest data (DG-1), and no staff attribute beyond what a session needs - staff data is governed by DG-5, so no payroll identifier and no date of birth appears here or is accepted from any caller.",
        "required": [
          "sessionId",
          "staffMemberId",
          "tenantId",
          "propertyId",
          "credentialType",
          "languageTag",
          "permissions",
          "switchableProperties",
          "expiresAt"
        ],
        "properties": {
          "sessionId": {
            "type": "string",
            "description": "ULID. Identifies this session for remote sign-out (FR-64)."
          },
          "staffMemberId": {
            "type": "string"
          },
          "displayName": {
            "type": "string",
            "description": "The Staff Member's own name. Never a guest name."
          },
          "tenantId": {
            "type": "string"
          },
          "propertyId": {
            "type": "string",
            "description": "The Property this session is scoped to right now. Changing it mints a new token (AD-3); it is never changed by a header."
          },
          "credentialType": {
            "type": "string",
            "enum": [
              "sso",
              "pin",
              "badge"
            ],
            "description": "What the caller signed in WITH, not what role they hold. Capability differences live here so that adding a third credential type later does not mean revisiting every permission check (Story 1.3 T2, FR-4)."
          },
          "languageTag": {
            "type": "string",
            "description": "BCP 47. Applied at sign-in and reverted for the next person on a Shared Device (FR-61, AD-12) - locale is session state, not app state."
          },
          "permissions": {
            "type": "array",
            "description": "The server's answer, re-resolved for the current Property on every request. The interface only hides what the server would refuse; it never decides (AD-11). A client that caches this across a context switch is wrong.",
            "items": {
              "type": "string"
            }
          },
          "switchableProperties": {
            "type": "array",
            "description": "Properties this Staff Member holds a role at within this Tenant, for the context picker. Never crosses a Tenant boundary.",
            "items": {
              "$ref": "#/components/schemas/PropertyRef"
            }
          },
          "expiresAt": {
            "type": "string",
            "format": "date-time"
          }
        }
      },
      "PropertyRef": {
        "type": "object",
        "required": [
          "id",
          "name"
        ],
        "properties": {
          "id": {
            "type": "string"
          },
          "name": {
            "type": "string"
          }
        }
      },
      "SessionToken": {
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
            "description": "Bearer token carrying tenant and property (AD-3) and NO guest data (DG-1). Deliberately short-lived, because the refresh is where upstream deprovisioning bites (Story 1.5 AC-2)."
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
          "refreshToken": {
            "type": "string",
            "description": "Single-use; presenting it twice invalidates the session chain. ABSENT for PIN and badge sessions, which end at the inactivity timeout and return the handset to the sign-in screen (Story 4.1 AC-2) rather than holding a long-lived credential on a device left in a corridor."
          },
          "session": {
            "$ref": "#/components/schemas/Session"
          }
        }
      },
      "SwitchContextRequest": {
        "type": "object",
        "required": [
          "propertyId"
        ],
        "properties": {
          "propertyId": {
            "type": "string"
          }
        }
      },
      "SsoCallbackRequest": {
        "type": "object",
        "description": "Exactly one of `code` (OIDC) or `samlResponse` (SAML 2.0). Both travel in the body, never a query string, and neither is ever logged.",
        "required": [
          "state"
        ],
        "properties": {
          "state": {
            "type": "string",
            "description": "Opaque, single-use, and bound to the /auth/sso/start that issued it."
          },
          "code": {
            "type": "string"
          },
          "samlResponse": {
            "type": "string"
          }
        },
        "oneOf": [
          {
            "required": [
              "code"
            ]
          },
          {
            "required": [
              "samlResponse"
            ]
          }
        ]
      },
      "RefreshRequest": {
        "type": "object",
        "required": [
          "refreshToken"
        ],
        "properties": {
          "refreshToken": {
            "type": "string"
          }
        }
      },
      "DeviceSignInRequest": {
        "type": "object",
        "required": [
          "deviceId",
          "credential"
        ],
        "properties": {
          "deviceId": {
            "type": "string",
            "description": "The Property-issued Shared Device. Identifies the device for session hygiene (FR-64). It is NOT part of the idempotency key, which is keyed to the person (AD-7) - a device-scoped key would collide across shifts."
          },
          "credential": {
            "description": "One credential abstraction, so a badge Property needs no second flow.",
            "oneOf": [
              {
                "$ref": "#/components/schemas/PinCredential"
              },
              {
                "$ref": "#/components/schemas/BadgeCredential"
              }
            ],
            "discriminator": {
              "propertyName": "type",
              "mapping": {
                "pin": "#/components/schemas/PinCredential",
                "badge": "#/components/schemas/BadgeCredential"
              }
            }
          }
        }
      },
      "PinCredential": {
        "type": "object",
        "required": [
          "type",
          "staffRef",
          "pin"
        ],
        "properties": {
          "type": {
            "type": "string",
            "enum": [
              "pin"
            ]
          },
          "staffRef": {
            "type": "string",
            "maxLength": 32,
            "description": "A short Property-scoped reference to the Staff Member - not an email address. A linen-room handset at the start of a shift should not require typing one. Never logged."
          },
          "pin": {
            "type": "string",
            "minLength": 4,
            "maxLength": 32,
            "writeOnly": true
          }
        }
      },
      "BadgeCredential": {
        "type": "object",
        "required": [
          "type",
          "badgeData"
        ],
        "properties": {
          "type": {
            "type": "string",
            "enum": [
              "badge"
            ]
          },
          "badgeData": {
            "type": "string",
            "writeOnly": true,
            "description": "Opaque badge read. Never logged."
          }
        }
      },
      "DeviceSession": {
        "type": "object",
        "description": "One live session on one Shared Device. Carries no guest context (DG-1).",
        "required": [
          "sessionId",
          "deviceId",
          "staffMemberId",
          "propertyId",
          "credentialType",
          "startedAt",
          "lastSeenAt",
          "current"
        ],
        "properties": {
          "sessionId": {
            "type": "string"
          },
          "deviceId": {
            "type": "string"
          },
          "deviceLabel": {
            "type": "string",
            "description": "How the Property names the handset, so an administrator can tell which one this is."
          },
          "staffMemberId": {
            "type": "string"
          },
          "propertyId": {
            "type": "string"
          },
          "credentialType": {
            "type": "string",
            "enum": [
              "sso",
              "pin",
              "badge"
            ]
          },
          "startedAt": {
            "type": "string",
            "format": "date-time"
          },
          "lastSeenAt": {
            "type": "string",
            "format": "date-time",
            "description": "Last successful contact. A device offline for a shift shows a stale value and is still signed in - see the revocation's 202."
          },
          "current": {
            "type": "boolean",
            "description": "True for the caller's own session."
          }
        }
      },
      "SignInRequest": {
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
      "CredentialSetUpRequest": {
        "type": "object",
        "required": [
          "token",
          "password"
        ],
        "properties": {
          "token": {
            "type": "string",
            "writeOnly": true,
            "description": "Single-use, short-lived, delivered in the URL FRAGMENT of the invitation link and submitted here in the body - never in a query string, where it would land in access logs and Referer headers."
          },
          "password": {
            "type": "string",
            "writeOnly": true,
            "minLength": 12,
            "maxLength": 256
          }
        }
      },
      "PasswordForgotRequest": {
        "type": "object",
        "required": [
          "email"
        ],
        "properties": {
          "email": {
            "type": "string",
            "format": "email",
            "maxLength": 320
          }
        }
      },
      "PasswordResetRequest": {
        "type": "object",
        "required": [
          "token",
          "password"
        ],
        "properties": {
          "token": {
            "type": "string",
            "writeOnly": true,
            "description": "As in CredentialSetUpRequest - fragment-delivered",
            "single-use.": null
          },
          "password": {
            "type": "string",
            "writeOnly": true,
            "minLength": 12,
            "maxLength": 256
          }
        }
      },
      "SignInResult": {
        "type": "object",
        "description": "A password sign-in has two outcomes and this is the discriminated shape of both, so that Story 12.2 makes the second branch REACHABLE without changing the response type any client already parses. Until then `status` is always `authenticated`. A `oneOf` at the top level would have forced every caller in two languages to re-derive which branch it got.",
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
                "$ref": "#/components/schemas/SessionToken"
              }
            ],
            "description": "Present when `status` is `authenticated`."
          },
          "challenge": {
            "allOf": [
              {
                "$ref": "#/components/schemas/MfaChallenge"
              }
            ],
            "description": "Present when `status` is `mfa_required`."
          }
        }
      },
      "MfaChallenge": {
        "type": "object",
        "description": "Proof that a password was accepted, and nothing else. Not a session, not a scope, not a bearer token - see `/auth/mfa/challenge/verify`.",
        "required": [
          "challengeToken",
          "expiresAt",
          "methods"
        ],
        "properties": {
          "challengeToken": {
            "type": "string",
            "writeOnly": true,
            "description": "Own audience, short lifetime, no scope, single purpose. Submitted in a body, never an `Authorization` header, and refused by every other endpoint."
          },
          "expiresAt": {
            "type": "string",
            "format": "date-time"
          },
          "methods": {
            "type": "array",
            "description": "What this Staff Member can answer with, app first because it needs no mailbox (Story 12.1 AC-5). One entry per enrolled factor.",
            "items": {
              "$ref": "#/components/schemas/MfaMethodOption"
            }
          }
        }
      },
      "MfaMethodOption": {
        "type": "object",
        "required": [
          "factorId",
          "method"
        ],
        "properties": {
          "factorId": {
            "type": "string"
          },
          "method": {
            "type": "string",
            "enum": [
              "totp",
              "email_otp"
            ]
          },
          "emailHint": {
            "type": "string",
            "description": "A masked hint for `email_otp` so the holder knows which mailbox to open - never the full address, which would make a challenge a disclosure."
          }
        }
      },
      "MfaFactor": {
        "type": "object",
        "description": "An enrolled second factor. Never carries a secret.",
        "required": [
          "factorId",
          "method",
          "active",
          "enrolledAt"
        ],
        "properties": {
          "factorId": {
            "type": "string"
          },
          "method": {
            "type": "string",
            "enum": [
              "totp",
              "email_otp"
            ]
          },
          "active": {
            "type": "boolean",
            "description": "False between `/auth/mfa/enrolment` and a successful verify."
          },
          "appHint": {
            "type": "string",
            "enum": [
              "google_authenticator",
              "microsoft_authenticator",
              "other"
            ],
            "description": "`totp` only, and a SUPPORT HINT ONLY - which app the Staff Member said they used. It never affects verification, because both apps consume the same secret and a code from either is valid."
          },
          "enrolledAt": {
            "type": "string",
            "format": "date-time"
          },
          "lastUsedAt": {
            "type": "string",
            "format": "date-time"
          }
        }
      },
      "StartMfaEnrolmentRequest": {
        "type": "object",
        "required": [
          "method"
        ],
        "properties": {
          "method": {
            "type": "string",
            "enum": [
              "totp",
              "email_otp"
            ]
          },
          "appHint": {
            "type": "string",
            "enum": [
              "google_authenticator",
              "microsoft_authenticator",
              "other"
            ]
          }
        }
      },
      "MfaEnrolment": {
        "type": "object",
        "description": "The inactive factor, plus the one-time enrolment material for `totp`. The secret appears HERE AND NOWHERE ELSE, ever again.",
        "required": [
          "factor"
        ],
        "properties": {
          "factor": {
            "$ref": "#/components/schemas/MfaFactor"
          },
          "otpauthUri": {
            "type": "string",
            "description": "`totp` only. `otpauth://totp/...` - the QR code's contents, and the same string Google Authenticator, Microsoft Authenticator or any other TOTP app consumes. Absent for `email_otp`."
          },
          "manualEntryKey": {
            "type": "string",
            "description": "`totp` only. The same secret, formatted for typing, because a phone camera that will not focus is a support call otherwise."
          }
        }
      },
      "VerifyMfaEnrolmentRequest": {
        "type": "object",
        "required": [
          "factorId",
          "code"
        ],
        "properties": {
          "factorId": {
            "type": "string"
          },
          "code": {
            "type": "string",
            "writeOnly": true,
            "minLength": 4,
            "maxLength": 12
          }
        }
      },
      "VerifyMfaChallengeRequest": {
        "type": "object",
        "required": [
          "challengeToken",
          "factorId",
          "code"
        ],
        "properties": {
          "challengeToken": {
            "type": "string",
            "writeOnly": true
          },
          "factorId": {
            "type": "string"
          },
          "code": {
            "type": "string",
            "writeOnly": true,
            "minLength": 4,
            "maxLength": 12
          }
        }
      },
      "ResendMfaChallengeRequest": {
        "type": "object",
        "required": [
          "challengeToken",
          "factorId"
        ],
        "properties": {
          "challengeToken": {
            "type": "string",
            "writeOnly": true
          },
          "factorId": {
            "type": "string"
          }
        }
      }
    }
  }
} as const;
export const OPENAPI_VERSION = "0.1.0";
