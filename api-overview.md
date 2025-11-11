# CondoconnectAI API Documentation

## Overview

The CondoconnectAI API is a comprehensive RESTful API that provides access to all condominium management features including resident management, payment processing, maintenance tracking, security monitoring, and AI-powered insights.

## Base URL

Production: https://api.condoconnectai.com/v1  Staging: https://staging-api.condoconnectai.com/v1  Development: https://dev-api.condoconnectai.com/v1 


## Authentication

All API requests require authentication using JWT tokens obtained through AWS Cognito.

### Authentication Flow

1. **Sign In**
   ```http
   POST /auth/signin
   Content-Type: application/json

   {
     "email": "user@example.com",
     "password": "password123"
   }
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 3600,
    "user": {
      "id": "user-123",
      "email": "user@example.com",
      "name": "John Doe",
      "role": "resident",
      "tenantId": "tenant-456"
    }
  }
}

Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...