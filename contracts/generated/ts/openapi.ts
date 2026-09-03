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
    "description": "Story 1.0 surface only. Commands are POSTs returning the accepted event; reads are projections. Every request resolves to exactly one Tenant and Property."
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
    }
  },
  "components": {
    "securitySchemes": {
      "bearerAuth": {
        "type": "http",
        "scheme": "bearer",
        "description": "STORY 1.0 ONLY - a fixture auth stub, gated behind `FIXTURE_AUTH=1` so it cannot ship enabled. The token is an HMAC-signed `{tenantId, propertyId, staffMemberId}`, and what it exists to exercise is the TENANCY RESOLUTION BOUNDARY, not the credential. Story 1.3 brings PIN credentials for shared devices and Story 1.5 brings the Tenant identity provider, which removes this stub's production path."
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
      }
    }
  }
} as const;
export const OPENAPI_VERSION = "0.1.0";
