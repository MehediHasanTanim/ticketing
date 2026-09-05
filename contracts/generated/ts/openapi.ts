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
    "description": "Commands are POSTs returning the accepted event; reads are projections. Every request resolves to exactly one Tenant and Property.\n\nStory 1.0 built the health, docs, SLA-fold and isolation-fixture surfaces; 1.1 and 1.2 brought Tenant provisioning and Properties; 1.3 brought Staff Members, roles per Property and the session. The remaining `auth` operations are DESIGNED HERE AND BUILT LATER: each is marked `x-implemented: false` with an `x-story` naming its owner, and each answers 501 `not_implemented` until that story lands. A flag flipped without a handler behind it makes the smoke suite red, so it cannot be used to mark work done."
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
      "name": "properties",
      "description": "Properties, created by a tenant administrator on their own authority (FR-1). The only TENANT-scoped operations here: creating the first Property has no Property to be scoped to, which is the one thing AD-3 cannot cover."
    },
    {
      "name": "staff",
      "description": "Staff Members, their roles per Property, and the shipped role set. TENANT-scoped for the same reason as properties: an invitation spans Properties, so it cannot be scoped to one."
    },
    {
      "name": "tenant-settings",
      "description": "Tenant defaults, the blast radius of changing one, and the per-Property overrides that decline it. One resolution rule serves both surfaces: the Tenant view and the Property view must never disagree about what is in force."
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
                "description": "The provider's authorisation endpoint, carrying `state` and a PKCE `code_challenge` (S256). No secret and no token appears in it.",
                "schema": {
                  "type": "string"
                }
              }
            }
          },
          "400": {
            "description": "ONE answer for every reason this cannot proceed - unknown Tenant, no connection, an inactive one - so the endpoint cannot be used to discover which Tenants exist or which have SSO.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ErrorEnvelope"
                }
              }
            }
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
        "security": [],
        "summary": "Sign in with an email address and a password.",
        "description": "The documented fallback for corporate and management users whose Tenant has not connected an identity provider. Where a Tenant HAS connected one, this is refused for identities that provider governs - otherwise connecting SSO would leave a second, weaker door open beside it, and FR-3's promise that a deprovisioned identity loses access would be worth nothing.\n\nOne generic failure for every rejection - unknown address, wrong password, disabled account, an address governed by a connected provider - so the screen cannot be used to discover who has an account or which Tenants use SSO. Rate-limited per address and per source. Never logs the password, and never accepts it in a query string.\n\nThe response's `session.switchableProperties` is what the property picker on this surface renders; a caller with one Property gets one entry and the picker does not appear.\n\nLIMITATION, FLAGGED RATHER THAN HIDDEN. An email address is unique within a Tenant and NOT across Tenants - global uniqueness would make an invitation's 409 reveal that the address already has an account somewhere else, which is precisely the cross-Tenant leak FR-1 exists to prevent. So this operation resolves the address against every Tenant and requires exactly one password to match. A person who holds accounts at two Tenants with the SAME address and the SAME password cannot be resolved and is refused with the same generic failure as everyone else; the collision is logged for an operator. The proper fix is a Tenant hint, and the slug that would carry it arrives with SSO in Story 1.5 - so it is raised there rather than invented here.",
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
        "security": [],
        "summary": "Ask for a password reset link.",
        "description": "POLICY SETTLED 2026-09-04: self-service reset IS permitted (ADR 0002, question 4). What that costs is worth writing down where the endpoint lives rather than only in the ADR: for a Staff Member with NO SECOND FACTOR enrolled, this endpoint makes control of the mailbox sufficient to take the account. MFA exists to close that (FR-84, FR-85) and is Epic 12 in R2, so until it ships every password account here is a mailbox away from takeover. That is a deliberate position, not an oversight.\n\nThe shape itself is not in doubt: **always 202**, whether or not the address exists, whether or not it is governed by SSO. A response that differs is an account-enumeration oracle, and this is the one endpoint on the product that anyone can call.",
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
        "security": [],
        "summary": "Set a new password from a reset token.",
        "description": "Governed by the same settled policy as `/auth/password/forgot`.\n\nReturns **204 and no session**, unlike credential set-up, and REVOKES EVERY OTHER SESSION for that Staff Member. The asymmetry is deliberate: a set-up is a first arrival with nothing to protect, while a reset may be the response to a credential already in someone else's hands, so it has to end the sessions that credential could have opened - including on any Shared Device. The holder signs in again through `/auth/sign-in`, which is also the only way they learn the new password works.\n\nToken single-use and short-lived, delivered in a URL fragment and submitted in this body. One generic `validation_failed` for unknown, expired and already-used alike.",
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
        "security": [],
        "summary": "Exchange a refresh token for a new short-lived access token.",
        "description": "This is the mechanism behind \"access is lost at next token validation, without a manual step in JazzTicketing\" (Story 1.5 AC-2): upstream state is re-checked HERE. Access tokens are therefore deliberately short-lived, and the refresh is where deprovisioning bites. A deprovisioned, disabled or revoked identity gets `unauthenticated` and the refresh token is burned. Rotation is single-use - presenting the same refresh token twice invalidates the whole session chain, because a replay means the token is no longer in only one place. Body, never a URL; never logged.\n\nLIFETIME SETTLED 2026-09-05: the access token lives **15 minutes**, and that number is the answer to \"how long does a deprovisioned identity keep working\" - a product commitment under FR-3, not a tuning constant. Changing it changes what the product promises, so it is stated here and in ADR 0002 rather than left in a module somebody tunes.",
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
    },
    "/identity-provider": {
      "get": {
        "operationId": "getIdentityProvider",
        "tags": [
          "auth"
        ],
        "x-story": "1.5",
        "summary": "The Tenant's identity connection, without its secret.",
        "description": "NO SECRET IS EVER RETURNED, and none is stored in this row: the connection holds a REFERENCE into the platform secret store, and the value is resolved at the moment it is used. An administration screen that can display a client secret is a screen that can leak one.",
        "responses": {
          "200": {
            "description": "the connection, or `connected: false` when there is none",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/IdentityConnection"
                }
              }
            }
          },
          "401": {
            "$ref": "#/components/responses/Error"
          },
          "403": {
            "$ref": "#/components/responses/Error"
          }
        }
      },
      "put": {
        "operationId": "connectIdentityProvider",
        "tags": [
          "auth"
        ],
        "x-story": "1.5",
        "summary": "Connect or reconfigure this Tenant's identity provider.",
        "description": "IDEMPOTENT, hence PUT: a Tenant has at most one connection, and reconfiguring it is the same act as connecting it. Recorded either way with the actor and the previous value (FR-6), because changing where a Tenant's people authenticate is among the most consequential things an administrator can do.\n\n**JUST-IN-TIME PROVISIONING IS OFF BY DEFAULT** (FR-83), and that is a security decision rather than a preference: authentication is not authorisation. Omitting `justInTimeProvisioning` leaves it off; turning it on is an audited Tenant-level change. With it off, an identity that authenticates successfully but matches no provisioned Staff Member gets `forbidden` and NO SESSION - not a session holding an empty permission set, which every client would then have to remember to handle.\n\nSAML 2.0 connections are ACCEPTED AND STORED, and a SAML sign-in is refused until a reviewed XML signature library is adopted - see the story record. XML signature verification is the most historically broken thing in identity (signature wrapping), and hand-rolling it in the auth path would be worse than not shipping it.",
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/ConnectIdentityProviderRequest"
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "the connection as it now stands",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/IdentityConnection"
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
          }
        }
      },
      "delete": {
        "operationId": "disconnectIdentityProvider",
        "tags": [
          "auth"
        ],
        "x-story": "1.5",
        "summary": "Disconnect the provider. Existing sessions are revoked.",
        "description": "Disconnecting REVOKES every session that was opened through the provider, and leaves password and PIN credentials alone. The alternative - letting SSO sessions run to their natural expiry - would mean a Tenant that disconnected a compromised provider still had people signed in through it.\n\nThe connection row is kept and marked inactive rather than deleted, so the audit trail still resolves what a past session authenticated against.",
        "responses": {
          "200": {
            "description": "disconnected, with the number of sessions revoked",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/IdentityConnection"
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
          "404": {
            "$ref": "#/components/responses/Error"
          }
        }
      }
    },
    "/roles": {
      "get": {
        "operationId": "listRoles",
        "tags": [
          "staff"
        ],
        "x-story": "1.3",
        "summary": "The role picker's contents.",
        "description": "AC-2: the picker offers AT MINIMUM line staff, supervisor, department manager, front office, duty manager, property administrator and corporate viewer. Those seven are seeded per Tenant by Story 1.1, so this reads the Tenant's own roles rather than a constant - which is also what makes Story 1.4's custom roles appear here without changing this operation.\n\n`assignableAtTenantScope` is the part a picker cannot infer: a corporate viewer's authority IS the Tenant (AC-5) and a property administrator may hold either scope, while a line staff role assigned Tenant-wide would be a silent privilege grant across every Property.\n\nSince Story 1.4 each role also carries its own PERMISSION SET, stored per Tenant rather than compiled in, plus `editable` and `duplicatedFrom`. A shipped role is duplicable and not editable (FR-81), and a duplicate is independent at creation - which AC-1 requires the interface to say BEFORE the copy is made, not after.",
        "responses": {
          "200": {
            "description": "the Tenant's roles, shipped ones first",
            "content": {
              "application/json": {
                "schema": {
                  "type": "array",
                  "items": {
                    "$ref": "#/components/schemas/Role"
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
          }
        }
      }
    },
    "/permissions": {
      "get": {
        "operationId": "listPermissions",
        "tags": [
          "staff"
        ],
        "x-story": "1.4",
        "summary": "The permission catalogue, and the dependency graph, as data.",
        "description": "THE DEPENDENCY GRAPH IS DATA, and this is where the interface reads it. Story 1.4 T1 requires one function, used by both the interface and the server, to decide whether a permission may be enabled - \"a hand-written conditional per screen will drift\". Serving the graph rather than restating it in the console is what makes that one function possible.\n\n`dependsOn` names the permissions that must ALSO be present. Enabling a permission while a dependency is absent is refused server-side and the refusal names the specific dependency (AC-2); the interface disabling the control first is a courtesy, not the control.\n\n`class` and `minimumScope` are the two things a role editor cannot infer. `class` decides which credential types can carry the permission at all - a PIN carries `operational` only, whatever role its holder has (FR-4) - and `minimumScope` says whether a grant at one Property confers it or whether only Tenant-wide authority does.",
        "responses": {
          "200": {
            "description": "every permission this build knows, ordered by key",
            "content": {
              "application/json": {
                "schema": {
                  "type": "array",
                  "items": {
                    "$ref": "#/components/schemas/PermissionSpec"
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
          }
        }
      }
    },
    "/staff": {
      "post": {
        "operationId": "inviteStaffMember",
        "tags": [
          "staff"
        ],
        "x-story": "1.3",
        "summary": "Invite a person and give them roles at one or more Properties.",
        "description": "The Staff Member is created with EXACTLY the roles requested at exactly the Properties requested (AC-1). Two credential paths, decided by whether an email address is present:\n\n**With an email**: an invitation is recorded and a credential set-up link is queued for delivery. The token travels in the link's FRAGMENT and is redeemed at `/auth/credential/set-up`.\n\n**Without an email**: a PIN-only account usable on a Shared Device. The PIN is returned in THIS RESPONSE AND NOWHERE ELSE - there is no mailbox to send it to, so the inviting administrator is the only channel, and only its hash is stored. A PIN never authorises configuration or reporting surfaces whatever role it carries (FR-4); that limit belongs to the credential, not to the role.\n\nAUTHORISED PER PAIR, not per request: an administrator scoped to one Property cannot grant a role at another, and a crafted payload naming a Property in another Tenant answers `not_found` rather than `forbidden`, so the response cannot be used to discover that it exists.\n\nStaff data is governed by DG-5. A payroll identifier or a date of birth is REFUSED rather than ignored - silently dropping a field a caller believed was stored is how a system ends up with two beliefs about what it holds.",
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/InviteStaffMemberRequest"
              }
            }
          }
        },
        "responses": {
          "201": {
            "description": "the Staff Member, and the PIN if this is a PIN-only account",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/InvitedStaffMember"
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
          "409": {
            "description": "this email address already belongs to a Staff Member in this Tenant",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ErrorEnvelope"
                }
              }
            }
          }
        }
      },
      "get": {
        "operationId": "listStaffMembers",
        "tags": [
          "staff"
        ],
        "x-story": "1.3",
        "summary": "The Staff Members I may see.",
        "description": "AC-5, on a real read rather than a hypothetical one: a corporate-scoped Staff Member receives only records from Properties WITHIN THEIR OWN TENANT, and a Property-scoped one only from the Properties they hold a role at. The predicate is applied server-side; `propertyId` narrows the answer and can never widen it.",
        "parameters": [
          {
            "name": "propertyId",
            "in": "query",
            "required": false,
            "description": "Narrow to one Property. A Property the caller holds no role at returns nothing, not everything.",
            "schema": {
              "type": "string"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Staff Members, oldest first",
            "content": {
              "application/json": {
                "schema": {
                  "type": "array",
                  "items": {
                    "$ref": "#/components/schemas/StaffMember"
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
          }
        }
      }
    },
    "/roles/{roleKey}/duplicate": {
      "post": {
        "operationId": "duplicateRole",
        "tags": [
          "staff"
        ],
        "x-story": "1.4",
        "summary": "Copy a role and edit the copy. Shipped roles are duplicable, never editable.",
        "description": "A shipped role is DUPLICABLE BUT NOT EDITABLE, so the baseline Jazzware support can reason about stays intact for every Tenant (FR-81, AC-1). The way to get a hotel's own job title is to copy the nearest shipped role and change the copy.\n\nTHE COPY IS INDEPENDENT AT CREATION. Its permission set is copied BY VALUE, and later changes to the source do not propagate - deliberately unlike Property settings, which inherit by reference (AD-9, Story 1.2). The two behaviours are different on purpose and share no helper. AC-1 requires the interface to state this **before** the copy is made; `duplicatedFrom` and `independentOfSource` on the result are what a client renders afterwards, and the statement beforehand is a console requirement that the console must carry.\n\nBoth guards apply here as well as on edit: the copied set is re-validated against the dependency graph, and against what the CALLER themselves holds. Copying a role containing a permission the caller lacks is refused - otherwise duplication would be the way around the escalation guard.",
        "parameters": [
          {
            "name": "roleKey",
            "in": "path",
            "required": true,
            "description": "The role being copied. May be shipped or custom.",
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
                "$ref": "#/components/schemas/DuplicateRoleRequest"
              }
            }
          }
        },
        "responses": {
          "201": {
            "description": "the new, independent role",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Role"
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
            "description": "The caller lacks `role.define`, or the copy would carry a permission they do not themselves hold. `details.permission` names it.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ErrorEnvelope"
                }
              }
            }
          },
          "404": {
            "$ref": "#/components/responses/Error"
          },
          "409": {
            "description": "a role with that key already exists in this Tenant",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ErrorEnvelope"
                }
              }
            }
          }
        }
      }
    },
    "/roles/{roleKey}": {
      "patch": {
        "operationId": "updateRole",
        "tags": [
          "staff"
        ],
        "x-story": "1.4",
        "summary": "Edit a custom role. The two guards are here.",
        "description": "The whole permission set is sent, not a delta: a role's permissions are one fact, and a delta protocol would make \"what did this used to be\" - which FR-6 requires in the audit trail - a reconstruction rather than a reading.\n\n**GUARD 1, ESCALATION (AC-3).** A permission the caller does not themselves hold is refused, server-side, with `details.permission` naming it. Compared against the caller's TENANT-WIDE effective permissions and not their session's: a role is a Tenant-wide object, so authority to write a permission into one has to be Tenant-wide too, or a permission held at one Property becomes a Tenant-wide capability by being written into a definition. Checked FIRST, before the dependency guard, so a failing dependency can never mask an escalation attempt in the audit trail.\n\n**GUARD 2, DEPENDENCIES (AC-2).** A permission whose dependency is absent is refused, and `details.unmet` names each permission and the dependency it needs - all of them, not the first, because this operation sends a whole set and fixing them one round trip at a time is a worse interface than the one the criterion asks for.\n\nA SHIPPED ROLE IS REFUSED OUTRIGHT (AC-1), at the database as well as here. That includes its Recovery approval threshold: the threshold is part of a role, shipped roles are not editable, so setting one means duplicating first. That is a real consequence of FR-81 rather than an oversight - see the story record.",
        "parameters": [
          {
            "name": "roleKey",
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
                "$ref": "#/components/schemas/UpdateRoleRequest"
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "the role as it now stands",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Role"
                }
              }
            }
          },
          "400": {
            "description": "A dependency is unmet. `details.unmet` is a list of `{ permission, requires }` pairs naming every one.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ErrorEnvelope"
                }
              }
            }
          },
          "401": {
            "$ref": "#/components/responses/Error"
          },
          "403": {
            "description": "The caller lacks `role.define`, or the change would grant a permission they do not themselves hold. `details.permission` names it.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ErrorEnvelope"
                }
              }
            }
          },
          "404": {
            "$ref": "#/components/responses/Error"
          },
          "409": {
            "description": "this is a shipped role, which is duplicable and not editable",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ErrorEnvelope"
                }
              }
            }
          }
        }
      }
    },
    "/tenant/settings": {
      "get": {
        "operationId": "getTenantSettings",
        "tags": [
          "tenant-settings"
        ],
        "x-story": "1.6",
        "summary": "Every Tenant default, with the blast radius of changing it.",
        "description": "`inheritingPropertyCount` is the stated blast radius: how many Properties would be affected by changing this key right now. `overriddenBy` names the ones that would not, so the two halves of AC-1 - what a change reaches and what it does not - are answerable from one response.\n\n`regions` is a READ-ONLY SUMMARY (AC-4). Region is chosen when a Property is created and immutable thereafter (DG-4): a data-residency obligation, not a preference. There is no operation on this surface that changes one, and the Tenant settings PATCH refuses the key outright rather than merely omitting a control - a missing control is not a refusal.",
        "responses": {
          "200": {
            "description": "the Tenant's defaults, their blast radius, and the region summary",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/TenantSettings"
                }
              }
            }
          },
          "401": {
            "$ref": "#/components/responses/Error"
          },
          "403": {
            "$ref": "#/components/responses/Error"
          }
        }
      },
      "patch": {
        "operationId": "updateTenantSettings",
        "tags": [
          "tenant-settings"
        ],
        "x-story": "1.6",
        "summary": "Change Tenant defaults. Applies to inheriting Properties and no others.",
        "description": "A change reaches every Property that has not taken the key over, and NO OTHERS (AC-1). It reaches them by REFERENCE - nothing is rewritten per Property - which is why a Property that overrode the key is untouched by construction rather than by a filter somebody remembered to write (AD-9).\n\nCross-Tenant guest history (FR-45) and retention (DG-2) are settable only here, never per Property, and every change to them is attributed in the audit trail with the actor and the PREVIOUS VALUE (AC-3, FR-6). Retention is bounded by a platform maximum; a value past it is refused rather than clamped, because silently storing a different number than an administrator typed is how a governance setting stops meaning anything.\n\nSending a value that is already in force is not a change and writes no audit entry: a trail full of non-changes is one nobody reads.",
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/UpdateTenantSettingsRequest"
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "the settings as they now stand, with recomputed blast radius",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/TenantSettings"
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
          }
        }
      }
    },
    "/properties/{propertyId}/settings": {
      "get": {
        "operationId": "getPropertySettings",
        "tags": [
          "tenant-settings"
        ],
        "x-story": "1.6",
        "summary": "What is in force at this Property, and what it inherits.",
        "description": "The other half of AC-2: an override is visible from the PROPERTY surface as well as the Tenant one. Each key says whether it is inherited, what is in force, and what the Tenant currently holds - so a Property administrator can see both the value they took over and the value they are declining.\n\nResolved by the same function the Tenant surface uses. The two must never disagree about what is in force, and the only way to guarantee that is for there to be one rule rather than two implementations of it.",
        "parameters": [
          {
            "name": "propertyId",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "the effective settings at this Property",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/PropertySettings"
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
          "404": {
            "$ref": "#/components/responses/Error"
          }
        }
      },
      "patch": {
        "operationId": "overridePropertySettings",
        "tags": [
          "tenant-settings"
        ],
        "x-story": "1.6",
        "summary": "Take a default over for this Property. Permanently.",
        "description": "An override STOPS INHERITANCE PERMANENTLY (AC-2). A later Tenant-level change does not silently re-apply, and there is no \"until the Tenant value changes\" state - the key is either this Property's or the Tenant's, and taking it is a decision that stands until somebody makes another one.\n\nInheritance is decided by the KEY'S PRESENCE and never by comparing values. A Property that overrides a key to the same value the Tenant happens to hold has still declined it: a resolver that asked \"is it different?\" would put such a Property back to inheriting, and the next Tenant change would reach one that had explicitly opted out.\n\nTENANT-ONLY KEYS ARE REFUSED HERE (AC-3), and the refusal names the reason: an administrator who tried to set retention for one Property needs to know it is a Tenant decision, not that they typed it wrong. Region is refused too, and is not a setting at all (DG-4).",
        "parameters": [
          {
            "name": "propertyId",
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
                "$ref": "#/components/schemas/OverridePropertySettingsRequest"
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "the effective settings at this Property, after the override",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/PropertySettings"
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
          }
        }
      }
    },
    "/properties": {
      "post": {
        "operationId": "createProperty",
        "tags": [
          "properties"
        ],
        "x-story": "1.2",
        "summary": "Create a Property and choose its region.",
        "description": "The region is the ONE IRREVERSIBLE DECISION a customer makes in this product, and it is refused later in three places rather than one: the aggregate, this document's lack of any route that accepts a change, and a database trigger that refuses it for every connection including an administrative one.\n\nA region no active cell serves is refused HERE, with the available regions named, rather than recorded and quietly unroutable - a Property whose data has nowhere to live is a problem discovered by whoever first tries to use it.\n\nThe Property INHERITS the Tenant defaults by reference to their version, not by copying values, because a Property that later overrides a default must stop inheriting it permanently (AD-9, Story 1.6). It is created `setupIncomplete`.",
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/CreatePropertyRequest"
              }
            }
          }
        },
        "responses": {
          "201": {
            "description": "the Property",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Property"
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
          "404": {
            "$ref": "#/components/responses/Error"
          },
          "409": {
            "description": "the Tenant is deactivated",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ErrorEnvelope"
                }
              }
            }
          }
        }
      },
      "get": {
        "operationId": "listProperties",
        "tags": [
          "properties"
        ],
        "x-story": "1.2",
        "summary": "The Properties in my Tenant.",
        "description": "Only Properties within the caller's own Tenant (FR-1). The predicate is explicit in the query because control-plane tables carry no row-level security - RLS protects the cell's guest-bearing tables (AD-4).",
        "responses": {
          "200": {
            "description": "the Tenant's Properties, oldest first",
            "content": {
              "application/json": {
                "schema": {
                  "type": "array",
                  "items": {
                    "$ref": "#/components/schemas/Property"
                  }
                }
              }
            }
          },
          "401": {
            "$ref": "#/components/responses/Error"
          }
        }
      }
    },
    "/properties/{propertyId}": {
      "get": {
        "operationId": "getProperty",
        "tags": [
          "properties"
        ],
        "x-story": "1.2",
        "parameters": [
          {
            "name": "propertyId",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "the Property",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Property"
                }
              }
            }
          },
          "401": {
            "$ref": "#/components/responses/Error"
          },
          "404": {
            "$ref": "#/components/responses/Error"
          }
        }
      },
      "patch": {
        "operationId": "refusePropertyRegionChange",
        "tags": [
          "properties"
        ],
        "x-story": "1.2",
        "summary": "Documented in order to refuse. There is no Property update.",
        "description": "AC-2 requires that a region change is refused \"through any interface\" with residency named as the reason, and asks for the DIRECT API CALL to be tested rather than only the absent form field. So this operation exists to answer that call properly: a body carrying a different `region` gets **403 with residency named**, not a bare 404 that leaves the caller guessing whether they used the wrong verb.\n\nNothing else about a Property is editable in Story 1.2 - name, timezone and currency changes are not among its criteria and are not invented here - so any other body is `not_found`. When a later story adds real editing, this operation grows a request schema; the region refusal stays.",
        "requestBody": {
          "required": false,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "region": {
                    "type": "string",
                    "description": "Send it and be refused. It exists in this schema so the refusal is documented rather than incidental."
                  }
                }
              }
            }
          }
        },
        "responses": {
          "401": {
            "$ref": "#/components/responses/Error"
          },
          "403": {
            "description": "A region change was attempted. `code` is `forbidden` and `details.reason` names residency.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ErrorEnvelope"
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
    "/properties/{propertyId}/setup": {
      "get": {
        "operationId": "getPropertySetupState",
        "tags": [
          "properties"
        ],
        "x-story": "1.2",
        "summary": "What is still outstanding, in the order it must be done.",
        "description": "AC-4. The list is DERIVED from what is actually missing, not read from a hard-coded checklist: each step declares a predicate over real state, so a step already done never appears and adding Story 1.7 changes the answer without changing the code.\n\nORDER IS THE CONTRACT. Rooms cannot be placed without Locations, an SLA Target is meaningless without a Catalog Entry to attach it to, and an Escalation chain needs someone to escalate to. Each step names the story that builds it, so an outstanding item is traceable rather than mysterious - and today every step is outstanding, because none of that work exists yet.",
        "parameters": [
          {
            "name": "propertyId",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "the Property and its outstanding steps",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/PropertySetupState"
                }
              }
            }
          },
          "401": {
            "$ref": "#/components/responses/Error"
          },
          "404": {
            "$ref": "#/components/responses/Error"
          }
        }
      }
    },
    "/properties/{propertyId}/deactivate": {
      "post": {
        "operationId": "deactivateProperty",
        "tags": [
          "properties"
        ],
        "x-story": "1.2",
        "summary": "Deactivate a Property. There is no delete.",
        "description": "AC-3: deletion is prevented and only deactivation is offered, so this document has no delete operation at all. A database trigger refuses one for every connection as well, because a rule stated only in a route is a rule the next route forgets.\n\nA deactivated Property's records STAY READABLE to authorised users and stop accepting new work: the tenancy boundary refuses writes scoped to an inactive Property while continuing to serve reads.",
        "parameters": [
          {
            "name": "propertyId",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "the Property, now inactive",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Property"
                }
              }
            }
          },
          "401": {
            "$ref": "#/components/responses/Error"
          },
          "404": {
            "$ref": "#/components/responses/Error"
          },
          "409": {
            "description": "already deactivated",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ErrorEnvelope"
                }
              }
            }
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
            "description": "The Property this session is scoped to right now. Changing it mints a new token (AD-3); it is never changed by a header.\n\nABSENT for a TENANT-SCOPED session, which is the same single exception to AD-3 that `POST /properties` is: FR-1 has a Jazzware operator create a Tenant and its first administrator and NO Properties, so that administrator's first session has no Property to be scoped to. They can create one; they can reach nothing Property-scoped until they do, and a Property-scoped operation answers `forbidden` naming the property picker rather than pretending. `core/src/tenancy.ts` has carried this distinction in the type system since Story 1.2 - a `TenantScope` is not assignable where a `Scope` is required."
          },
          "region": {
            "type": "string",
            "description": "The residency region of the Property this session is scoped to, and absent with `propertyId`. Stated in the session because the UX spine states it at sign-in - \"a residency fact, not a detail\" (DG-4) - and a client that has to fetch the Property to render it will render it inconsistently. Closes ADR 0002's question 6."
          },
          "credentialType": {
            "type": "string",
            "enum": [
              "sso",
              "password",
              "pin",
              "badge",
              "fixture"
            ],
            "description": "What the caller signed in WITH, not what role they hold. Capability differences live here so that adding a credential type later does not mean revisiting every permission check (Story 1.3 T2, FR-4): each permission declares a class, and a credential type declares which classes it may carry, so a PIN never authorises a configuration or reporting surface whatever role its holder has.\n\n`password` is the administrator fallback FR-1 makes structural - a Tenant's first administrator has no identity provider to sign in through - and it carries the holder's FULL role, unlike a PIN.\n\n`fixture` is Story 1.0's stub credential, refused unless `FIXTURE_AUTH=1` and removed by Story 1.5. It is named here rather than hidden: a session reporting `fixture` in an environment that should not have it is the cheapest possible way to notice, and a value the API can return but the schema denies is worse than an ugly one."
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
          "name",
          "region",
          "active"
        ],
        "description": "What a property picker renders. `region` is here for the same reason `Session.region` is: residency is a fact the person choosing a context should see (DG-4), and a picker that has to fetch each Property to show it will show it inconsistently.",
        "properties": {
          "id": {
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
            "description": "False for a deactivated Property. It STAYS in the picker on purpose: its records remain readable and only new work is refused (Story 1.2 AC-3), so removing it from the list would hide history rather than protect anything."
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
          "password",
          "name",
          "languageTag"
        ],
        "description": "`name` and `languageTag` are REQUIRED, which is the Story 1.1 / Story 1.3 agreement the two stories were told to reach before either started.\n\nStory 1.1 records the first administrator's invitation with an email address and nothing else - a Jazzware operator has no business typing a customer's administrator's name or choosing their language - so redemption is where the person describes themselves. Making them required for EVERY redemption, rather than only the first-administrator case, keeps one code path and leaks nothing: a set-up screen that asks a new arrival their name is ordinary, and their own spelling should win over whatever the inviting administrator typed.",
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
          },
          "name": {
            "type": "string",
            "maxLength": 200
          },
          "languageTag": {
            "type": "string",
            "description": "BCP 47, and one this product renders - English or Arabic in R1 (AD-12)."
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
      },
      "Role": {
        "type": "object",
        "required": [
          "key",
          "name",
          "isShipped",
          "editable",
          "assignableAtTenantScope",
          "permissions",
          "independentOfSource"
        ],
        "properties": {
          "key": {
            "type": "string"
          },
          "name": {
            "type": "string"
          },
          "isShipped": {
            "type": "boolean",
            "description": "Seeded by Story 1.1, one set per Tenant. A shipped role is DUPLICABLE AND NOT EDITABLE, so the baseline Jazzware support can reason about is the same everywhere (FR-81)."
          },
          "editable": {
            "type": "boolean",
            "description": "The inverse of `isShipped` today, and a separate field on purpose: it is what an interface should read, so that a later reason for a role to be locked - one Jazzware manages, say - does not mean every screen relearns the rule. Never a substitute for the server's refusal (AD-11)."
          },
          "assignableAtTenantScope": {
            "type": "boolean",
            "description": "Whether this role may be held across the whole Tenant rather than at one Property. True for the shipped property administrator and corporate viewer; false for every operational role, because a line staff role granted Tenant-wide is a privilege grant nobody asked for.\n\nSTORED, not derived - a corporate viewer holds only Property-scope permissions and is still Tenant-wide by design (Story 1.3 AC-5), so no derivation from the set can be right. A duplicate copies it from its source like everything else, and it can be changed on a custom role by anyone who already holds Tenant-wide authority, which `role.define` requires anyway.\n\nCOHERENCE: a role carrying a `tenant`-scope permission MUST be assignable Tenant-wide, or that permission can never be conferred by it. Saving one that is not is refused rather than accepted and quietly inert - \"an incoherent role\" is what the story exists to prevent."
          },
          "permissions": {
            "type": "array",
            "description": "The role's own set, stored per Tenant since Story 1.4 rather than compiled in. It is always dependency-complete: every permission's `dependsOn` is satisfied within this array, because nothing that is not can be saved.",
            "items": {
              "type": "string"
            }
          },
          "duplicatedFrom": {
            "type": "string",
            "description": "The role this one was copied from, kept for provenance and absent on a shipped role. It is a RECORD, not a link: the copy is independent at creation and later changes to the source do not reach it."
          },
          "independentOfSource": {
            "type": "boolean",
            "enum": [
              true
            ],
            "description": "Always true, and present in every representation for the same reason `Property.regionImmutable` is: AC-1 requires the interface to state, before a copy is made, that the duplicate will not inherit later changes to its source. A client asked to remember that rule on its own will forget it."
          },
          "recoveryApprovalThreshold": {
            "type": "integer",
            "description": "Minor units, for FR-43. Absent when unset. Story 9.4 owns what it means and builds the approval routing; this story stores it and routes nothing."
          },
          "updatedAt": {
            "type": "string",
            "format": "date-time"
          }
        }
      },
      "IdentityConnection": {
        "type": "object",
        "required": [
          "connected",
          "justInTimeProvisioning"
        ],
        "description": "A Tenant's connection, as an administrator may see it. No client secret, no signing key, no assertion - the row holds a reference into the platform secret store and this representation does not even hold that.",
        "properties": {
          "connected": {
            "type": "boolean"
          },
          "protocol": {
            "type": "string",
            "enum": [
              "oidc",
              "saml"
            ]
          },
          "issuer": {
            "type": "string",
            "description": "The provider's issuer identifier, matched against the `iss` claim on every token."
          },
          "clientId": {
            "type": "string"
          },
          "justInTimeProvisioning": {
            "type": "boolean",
            "description": "FR-83. False unless a Tenant deliberately turned it on, and turning it on is an audited change. With it off, authenticating proves who somebody is and grants them nothing."
          },
          "signInUrl": {
            "type": "string",
            "description": "Where this Tenant's people begin. Contains the Tenant's slug, which is a ROUTING HINT and not a credential - it identifies which provider to redirect to and confers nothing on its own."
          },
          "signInAvailable": {
            "type": "boolean",
            "description": "False for a stored SAML connection, which can be configured but cannot yet complete a sign-in. `unavailableReason` says why, so an administrator finds out when they connect it rather than when their people cannot get in."
          },
          "unavailableReason": {
            "type": "string"
          },
          "active": {
            "type": "boolean"
          },
          "updatedAt": {
            "type": "string",
            "format": "date-time"
          }
        }
      },
      "ConnectIdentityProviderRequest": {
        "type": "object",
        "required": [
          "protocol",
          "issuer",
          "clientId",
          "clientSecretRef"
        ],
        "additionalProperties": false,
        "properties": {
          "protocol": {
            "type": "string",
            "enum": [
              "oidc",
              "saml"
            ]
          },
          "issuer": {
            "type": "string",
            "maxLength": 512,
            "description": "An https URL. OIDC discovery is performed against it, so the endpoints are read from the provider rather than typed by an administrator who would otherwise have to keep them current."
          },
          "clientId": {
            "type": "string",
            "maxLength": 256
          },
          "clientSecretRef": {
            "type": "string",
            "maxLength": 128,
            "pattern": "^[A-Za-z0-9_.-]+$",
            "description": "A NAME IN THE PLATFORM SECRET STORE, never the secret itself. The value is resolved at the moment it is used and never stored, returned or logged. Refusing to accept the secret over this API is deliberate: a value that never enters the system cannot leak from it."
          },
          "justInTimeProvisioning": {
            "type": "boolean",
            "default": false,
            "description": "FR-83, off unless deliberately enabled. Omitted means off; there is no configuration in which it defaults on."
          }
        }
      },
      "PermissionSpec": {
        "type": "object",
        "required": [
          "key",
          "class",
          "minimumScope",
          "dependsOn"
        ],
        "description": "One permission, as the role editor needs to understand it. Served rather than restated in the console, so that the dependency rule has exactly one definition (Story 1.4 T1).",
        "properties": {
          "key": {
            "type": "string"
          },
          "class": {
            "type": "string",
            "enum": [
              "operational",
              "configuration",
              "reporting"
            ],
            "description": "Which CREDENTIAL types may carry it. A PIN and a badge carry `operational` only, whatever role their holder has (FR-4) - so a role containing configuration permissions still grants none of them to someone signed in on a Shared Device."
          },
          "minimumScope": {
            "type": "string",
            "enum": [
              "property",
              "tenant"
            ],
            "description": "`property` means a grant at one Property confers it. `tenant` means only a Tenant-wide grant does - creating and retiring Properties, and defining roles, are Tenant-level acts."
          },
          "dependsOn": {
            "type": "array",
            "description": "Permissions that must ALSO be present for this one to be enabled. Empty for most. Enabling a permission with an absent dependency is refused and the refusal names the dependency (AC-2).",
            "items": {
              "type": "string"
            }
          }
        }
      },
      "DuplicateRoleRequest": {
        "type": "object",
        "required": [
          "key",
          "name"
        ],
        "additionalProperties": false,
        "properties": {
          "key": {
            "type": "string",
            "maxLength": 64,
            "pattern": "^[a-z][a-z0-9_]*$",
            "description": "Stable and never reused: it is what `staff_roles` stores, so renaming a role must not orphan an assignment. Lower-case snake, and a key already in this Tenant - shipped or custom - is a conflict."
          },
          "name": {
            "type": "string",
            "maxLength": 200,
            "description": "What the role picker shows."
          },
          "permissions": {
            "type": "array",
            "description": "OPTIONAL. Omitted means an exact copy of the source's set, which is the ordinary case. Supplied means copy-then-change in one step, and both guards apply to what is supplied.",
            "items": {
              "type": "string"
            }
          },
          "assignableAtTenantScope": {
            "type": "boolean",
            "description": "Omitted copies the source's value."
          },
          "recoveryApprovalThreshold": {
            "type": "integer",
            "minimum": 0,
            "description": "Minor units, in the Property's currency. Stored here for FR-43 and consumed by Story 9.4, which owns what it MEANS and builds the approval routing - this story stores a number and routes nothing. Omitted leaves it unset, and 9.4 decides what unset means rather than this story guessing."
          }
        }
      },
      "UpdateRoleRequest": {
        "type": "object",
        "description": "Every field is optional, and `permissions` is sent WHOLE rather than as a delta - a role's permissions are one fact, and a delta protocol would make FR-6's \"previous value\" a reconstruction instead of a reading.",
        "additionalProperties": false,
        "properties": {
          "name": {
            "type": "string",
            "maxLength": 200
          },
          "permissions": {
            "type": "array",
            "items": {
              "type": "string"
            }
          },
          "assignableAtTenantScope": {
            "type": "boolean"
          },
          "recoveryApprovalThreshold": {
            "type": "integer",
            "minimum": 0,
            "nullable": true,
            "description": "Explicit null clears it."
          }
        }
      },
      "RoleAssignment": {
        "type": "object",
        "required": [
          "roleKey"
        ],
        "description": "A (Property, role) PAIR - the unit AC-1 asks for, so one Staff Member can hold different roles at different Properties in one Tenant.",
        "properties": {
          "propertyId": {
            "type": "string",
            "description": "OMITTED for a Tenant-wide grant, which only a role with `assignableAtTenantScope` accepts. Present for everything else."
          },
          "roleKey": {
            "type": "string"
          }
        }
      },
      "InviteStaffMemberRequest": {
        "type": "object",
        "required": [
          "name",
          "languageTag",
          "roles"
        ],
        "description": "Deliberately additionalProperties FALSE. DG-5 governs staff data, and a payroll identifier or date of birth arriving in an ignored field would be accepted-looking and unstored - so it is refused instead.",
        "additionalProperties": false,
        "properties": {
          "name": {
            "type": "string",
            "maxLength": 200
          },
          "languageTag": {
            "type": "string",
            "description": "BCP 47, and it must be a language this product renders (AD-12: English and Arabic in R1). Applied at sign-in and reverted for the next person on a Shared Device (FR-61) - the handset consumes it in Story 4.6, and it is stored here because this is where the person is described."
          },
          "email": {
            "type": "string",
            "format": "email",
            "maxLength": 320,
            "description": "Present means a credential set-up link. ABSENT means a PIN-only account for a Shared Device - two different accounts, decided by one field."
          },
          "roles": {
            "type": "array",
            "minItems": 1,
            "items": {
              "$ref": "#/components/schemas/RoleAssignment"
            }
          }
        }
      },
      "StaffMember": {
        "type": "object",
        "required": [
          "staffMemberId",
          "tenantId",
          "name",
          "languageTag",
          "roles",
          "credentialStatus",
          "active",
          "createdAt"
        ],
        "description": "No payroll identifier, no date of birth, and no guest data (DG-5, DG-1). Neither is accepted from a caller either, so neither can appear here later by accident.",
        "properties": {
          "staffMemberId": {
            "type": "string"
          },
          "tenantId": {
            "type": "string"
          },
          "name": {
            "type": "string"
          },
          "email": {
            "type": "string"
          },
          "languageTag": {
            "type": "string"
          },
          "roles": {
            "type": "array",
            "items": {
              "$ref": "#/components/schemas/RoleAssignment"
            }
          },
          "credentialStatus": {
            "type": "string",
            "enum": [
              "invited",
              "password_set",
              "pin_only"
            ],
            "description": "`invited` means the set-up link has not been redeemed yet, so this person cannot sign in. Story 1.1 leaves the first administrator in exactly that state until Story 1.3 redeems the invitation."
          },
          "active": {
            "type": "boolean"
          },
          "createdAt": {
            "type": "string",
            "format": "date-time"
          }
        }
      },
      "InvitedStaffMember": {
        "type": "object",
        "required": [
          "staffMember"
        ],
        "properties": {
          "staffMember": {
            "$ref": "#/components/schemas/StaffMember"
          },
          "pin": {
            "type": "string",
            "description": "RETURNED ONCE AND NEVER AGAIN, and only for a PIN-only account. There is no mailbox to deliver it to, so the inviting administrator is the channel; only its hash is stored, it appears in no log, and it cannot be read back. Absent whenever an email address was given."
          },
          "invitationExpiresAt": {
            "type": "string",
            "format": "date-time",
            "description": "Present when an email address was given. After this the link is refused."
          }
        }
      },
      "TenantSetting": {
        "type": "object",
        "required": [
          "key",
          "value",
          "scope",
          "inheritingPropertyCount",
          "overriddenBy"
        ],
        "properties": {
          "key": {
            "type": "string"
          },
          "value": {
            "description": "The Tenant-level value. Type depends on the key."
          },
          "scope": {
            "type": "string",
            "enum": [
              "inheritable",
              "tenant_only"
            ],
            "description": "`tenant_only` keys govern a whole management company's data - cross-Tenant guest history and retention - so no Property may answer them differently. A Property override of one is refused."
          },
          "inheritingPropertyCount": {
            "type": "integer",
            "description": "THE BLAST RADIUS. How many Properties would be affected by changing this key right now, computed live on every read. A cached count that is wrong is worse than no count, because it is the number somebody decides on."
          },
          "overriddenBy": {
            "type": "array",
            "description": "The Properties a change would NOT reach, and what each holds instead.",
            "items": {
              "$ref": "#/components/schemas/PropertyOverride"
            }
          },
          "governance": {
            "type": "string",
            "description": "Present on keys whose change is attributed for a stated reason (FR-45, DG-2, FR-85). The reason itself, so a settings screen can say why rather than marking it with an icon nobody can interpret."
          },
          "maximum": {
            "type": "integer",
            "description": "The platform maximum, where DG-2 imposes one. A value past it is refused, never clamped."
          }
        }
      },
      "PropertyOverride": {
        "type": "object",
        "required": [
          "propertyId",
          "name",
          "value"
        ],
        "properties": {
          "propertyId": {
            "type": "string"
          },
          "name": {
            "type": "string"
          },
          "value": {
            "description": "What this Property holds instead."
          }
        }
      },
      "TenantSettings": {
        "type": "object",
        "required": [
          "settings",
          "propertyCount",
          "regions"
        ],
        "properties": {
          "settings": {
            "type": "array",
            "items": {
              "$ref": "#/components/schemas/TenantSetting"
            }
          },
          "propertyCount": {
            "type": "integer",
            "description": "Active Properties in this Tenant, so a blast radius reads against a total."
          },
          "regions": {
            "type": "array",
            "description": "READ-ONLY (AC-4, DG-4). Region is chosen at Property creation and immutable thereafter; this surface shows it and offers no control, and the PATCH refuses the key.",
            "items": {
              "$ref": "#/components/schemas/PropertyRegion"
            }
          },
          "updatedAt": {
            "type": "string",
            "format": "date-time"
          }
        }
      },
      "PropertyRegion": {
        "type": "object",
        "required": [
          "propertyId",
          "name",
          "region",
          "active"
        ],
        "properties": {
          "propertyId": {
            "type": "string"
          },
          "name": {
            "type": "string"
          },
          "region": {
            "type": "string"
          },
          "active": {
            "type": "boolean"
          }
        }
      },
      "UpdateTenantSettingsRequest": {
        "type": "object",
        "minProperties": 1,
        "additionalProperties": true,
        "description": "One or more setting keys and their new values. `region` is refused rather than ignored, and so is any key that is not in the catalogue - a setting nobody implements confers nothing and looks like configuration."
      },
      "OverridePropertySettingsRequest": {
        "type": "object",
        "minProperties": 1,
        "additionalProperties": true,
        "description": "One or more INHERITABLE keys this Property takes over, permanently. A `tenant_only` key is refused with the reason named."
      },
      "PropertySettings": {
        "type": "object",
        "required": [
          "propertyId",
          "region",
          "regionImmutable",
          "settings"
        ],
        "properties": {
          "propertyId": {
            "type": "string"
          },
          "region": {
            "type": "string",
            "description": "Shown, never settable (DG-4)."
          },
          "regionImmutable": {
            "type": "boolean",
            "enum": [
              true
            ]
          },
          "settings": {
            "type": "array",
            "items": {
              "$ref": "#/components/schemas/EffectiveSetting"
            }
          }
        }
      },
      "EffectiveSetting": {
        "type": "object",
        "required": [
          "key",
          "value",
          "inherited",
          "tenantValue",
          "scope"
        ],
        "properties": {
          "key": {
            "type": "string"
          },
          "value": {
            "description": "What is in force here."
          },
          "inherited": {
            "type": "boolean",
            "description": "False once this Property has taken the key over - permanently. Decided by the key's presence in the override set, never by comparing values: a Property that overrode a key to the value the Tenant happens to hold has still declined it."
          },
          "tenantValue": {
            "description": "What the Tenant currently holds",
            "so a declined value is visible too.": null
          },
          "scope": {
            "type": "string",
            "enum": [
              "inheritable",
              "tenant_only"
            ]
          }
        }
      },
      "CreatePropertyRequest": {
        "type": "object",
        "required": [
          "name",
          "region",
          "timezone",
          "currency"
        ],
        "properties": {
          "name": {
            "type": "string",
            "maxLength": 200
          },
          "region": {
            "type": "string",
            "description": "IMMUTABLE FROM THIS MOMENT. Must be a region an active cell serves, or the request is refused with the available regions named. A Property never leaves its region (DG-4, AD-4)."
          },
          "timezone": {
            "type": "string",
            "description": "An IANA zone, checked against the runtime's own tz database rather than a list we would have to keep current. Presentation only - storage stays UTC (AD-2)."
          },
          "currency": {
            "type": "string",
            "pattern": "^[A-Z]{3}$",
            "description": "ISO-4217, shape-checked rather than matched against a closed list: a list of live codes changes without us, and rejecting a real code because ours is a year old is worse than accepting a typo that shows up in the first invoice. Money is minor-unit integers plus this code, with no conversion in v1."
          }
        }
      },
      "Property": {
        "type": "object",
        "required": [
          "propertyId",
          "tenantId",
          "name",
          "region",
          "regionImmutable",
          "cellName",
          "timezone",
          "currency",
          "active",
          "setupIncomplete",
          "createdAt"
        ],
        "properties": {
          "propertyId": {
            "type": "string"
          },
          "tenantId": {
            "type": "string"
          },
          "name": {
            "type": "string"
          },
          "region": {
            "type": "string"
          },
          "regionImmutable": {
            "type": "boolean",
            "enum": [
              true
            ],
            "description": "Always true, and present in every representation on purpose: AC-1 requires the region to be \"displayed as immutable from this point forward\", and a client asked to remember that rule on its own will eventually forget it."
          },
          "cellName": {
            "type": "string",
            "description": "Which cell holds this Property's operational rows. The control plane is the only thing that knows (AD-4), and it cannot change - a Property never moves cell."
          },
          "timezone": {
            "type": "string"
          },
          "currency": {
            "type": "string"
          },
          "active": {
            "type": "boolean",
            "description": "False once deactivated. Records stay readable; new work is refused."
          },
          "setupIncomplete": {
            "type": "boolean",
            "description": "Derived from the same predicates as the outstanding list rather than maintained beside them - two sources of truth for \"is setup done\" is how a Property ends up marked complete with steps outstanding."
          },
          "createdAt": {
            "type": "string",
            "format": "date-time"
          }
        }
      },
      "PropertySetupState": {
        "type": "object",
        "required": [
          "property",
          "outstanding",
          "complete"
        ],
        "properties": {
          "property": {
            "$ref": "#/components/schemas/Property"
          },
          "outstanding": {
            "type": "array",
            "description": "In the order the work must be done. Empty means setup is complete.",
            "items": {
              "$ref": "#/components/schemas/SetupStep"
            }
          },
          "complete": {
            "type": "boolean"
          }
        }
      },
      "SetupStep": {
        "type": "object",
        "required": [
          "key",
          "title",
          "story",
          "position"
        ],
        "properties": {
          "key": {
            "type": "string"
          },
          "title": {
            "type": "string",
            "description": "Shown to a property administrator."
          },
          "story": {
            "type": "string",
            "description": "The story that builds this step, so an outstanding item is traceable rather than mysterious. Today every step names a story that has not landed, which is why every step is outstanding."
          },
          "position": {
            "type": "integer",
            "minimum": 1,
            "description": "1-based",
            "so a caller can render \"3 of 8\" without recounting.": null
          }
        }
      }
    }
  }
} as const;
export const OPENAPI_VERSION = "0.1.0";
