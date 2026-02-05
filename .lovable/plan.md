

## Goal
Implement secure manager PIN storage and verification using bcrypt hashing via a backend function, replacing the current placeholder logic.

## Current State Analysis

| Component | Current Status |
|-----------|---------------|
| `manager_pins` table | Exists with `user_id`, `pin_hash` columns |
| RLS policies | Admins can manage all PINs, users can view own |
| PIN verification | Accepts any 4+ digit PIN (placeholder) |
| PIN settings save | UI only, doesn't persist to database |
| Backend functions | None exist |

## Security Architecture

```text
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────────┐      ┌──────────────────────┐        │
│  │  ManagerPinSettings  │      │   ManagerPinPad      │        │
│  │  (Admin/Manager)     │      │   (Kiosk)            │        │
│  │                      │      │                      │        │
│  │  - Set new PIN       │      │  - Enter PIN         │        │
│  │  - Change PIN        │      │  - Verify            │        │
│  └──────────┬───────────┘      └──────────┬───────────┘        │
│             │                              │                    │
└─────────────┼──────────────────────────────┼────────────────────┘
              │                              │
              ▼                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    BACKEND FUNCTIONS                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────────┐      ┌──────────────────────┐        │
│  │  manager-pin         │      │  manager-pin         │        │
│  │  action: "set"       │      │  action: "verify"    │        │
│  │                      │      │                      │        │
│  │  - Validate format   │      │  - No auth required  │        │
│  │  - Hash with bcrypt  │      │  - Compare hash      │        │
│  │  - Upsert to DB      │      │  - Return success    │        │
│  └──────────┬───────────┘      └──────────┬───────────┘        │
│             │                              │                    │
└─────────────┼──────────────────────────────┼────────────────────┘
              │                              │
              ▼                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    DATABASE                                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  manager_pins                                                    │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ id | user_id | pin_hash (bcrypt)      | created/updated  │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  RLS: Admins manage all, users view own                         │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Implementation Plan

### Step 1: Create Backend Function for PIN Operations

Create a single backend function `manager-pin` that handles both setting and verifying PINs:

**File:** `supabase/functions/manager-pin/index.ts`

```text
Endpoints:
  POST /manager-pin
  Body: { action: "set", pin: "1234", current_pin?: "oldpin" }
    - Requires authenticated admin/manager
    - Validates PIN format (4-8 digits)
    - Hashes PIN with bcrypt (cost factor 10)
    - If current_pin provided, verify it first
    - Upserts to manager_pins table
    - Returns { success: true }

  POST /manager-pin  
  Body: { action: "verify", pin: "1234" }
    - No authentication required (Kiosk use)
    - Fetches all manager PIN hashes (using service role)
    - Compares against each hash
    - Returns { valid: true, manager_id: "..." } if match
    - Returns { valid: false } if no match
```

### Step 2: Update ManagerPinSettings Component

Modify `src/components/settings/ManagerPinSettings.tsx` to:
- Call the backend function to set/update PIN
- Handle current PIN verification when changing
- Show proper loading states and error messages
- Clear form on successful save

### Step 3: Update ManagerPinPad Component  

Modify `src/components/kiosk/ManagerPinPad.tsx` to:
- Call the backend function to verify PIN
- Handle verification response
- Show proper error messages for invalid PIN
- Return manager info on success for audit trail

### Step 4: Create Custom Hook for PIN Operations

Create `src/hooks/useManagerPin.ts` to:
- Provide `verifyPin(pin)` function
- Provide `setPin(newPin, currentPin?)` function
- Handle loading and error states
- Encapsulate backend function calls

## Files to be Created/Modified

| File | Action | Description |
|------|--------|-------------|
| `supabase/functions/manager-pin/index.ts` | Create | Backend function for hash/verify |
| `src/hooks/useManagerPin.ts` | Create | Hook for PIN operations |
| `src/components/settings/ManagerPinSettings.tsx` | Modify | Use hook to persist PIN |
| `src/components/kiosk/ManagerPinPad.tsx` | Modify | Use hook to verify PIN |

## Technical Details

### Backend Function Implementation

```typescript
// supabase/functions/manager-pin/index.ts
import { createClient } from "npm:@supabase/supabase-js@2";
import * as bcrypt from "jsr:@da/bcrypt";

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const { action, pin, current_pin } = await req.json();
  
  if (action === "set") {
    // Require authentication
    const authHeader = req.headers.get("Authorization");
    // Validate user is admin/manager
    // Hash PIN: bcrypt.hashSync(pin, 10)
    // Upsert to manager_pins
  }
  
  if (action === "verify") {
    // No auth required - Kiosk use case
    // Fetch all PIN hashes using service role client
    // Compare: bcrypt.compareSync(pin, hash)
    // Return match result
  }
});
```

### Frontend Hook Implementation

```typescript
// src/hooks/useManagerPin.ts
export function useManagerPin() {
  const verifyPin = async (pin: string) => {
    const response = await supabase.functions.invoke("manager-pin", {
      body: { action: "verify", pin },
    });
    return response.data;
  };

  const setPin = async (newPin: string, currentPin?: string) => {
    const response = await supabase.functions.invoke("manager-pin", {
      body: { action: "set", pin: newPin, current_pin: currentPin },
    });
    return response.data;
  };

  return { verifyPin, setPin };
}
```

## Security Considerations

1. **PIN never stored in plain text** - Always hashed with bcrypt before storage
2. **PIN never logged** - No console.log or error messages containing the PIN
3. **Verification is timing-safe** - bcrypt.compareSync handles this internally
4. **Rate limiting consideration** - For production, add rate limiting to prevent brute force
5. **Audit trail** - Return manager_id on successful verification for attendance records
6. **No PIN in responses** - API never returns the PIN or hash in responses

## Success Criteria

- Admin/Manager can set a new PIN from Settings
- PIN is stored as bcrypt hash in database
- Kiosk PIN pad verifies against stored hashes
- Invalid PIN shows appropriate error message
- Successful verification allows manager override
- Attendance records can track which manager authorized override

## Testing Steps

1. Go to Settings > Manager PIN tab as admin
2. Enter a new PIN (e.g., "1234") and confirm it
3. Click "Update PIN" - should succeed
4. Go to Kiosk page (/kiosk)
5. Click "Manager Override" button
6. Enter the PIN "1234" - should succeed and open staff select
7. Try entering wrong PIN "9999" - should show error message
8. Verify database has hashed PIN (not plain text)

