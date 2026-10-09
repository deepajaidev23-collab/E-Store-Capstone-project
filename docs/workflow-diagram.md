# BookWorm — High-Level Workflow Diagram

```mermaid
flowchart TD
    A([User visits BookWorm]) --> B{Authenticated?}

    B -- No --> C[Browse Home / Catalogue / Book Detail]
    B -- Yes --> C

    C --> D{User Action}

    D -- Search & Filter --> C
    D -- View Book --> E[Book Detail Page]

    E --> F{Add to...}
    F -- Wishlist --> G{Logged in?}
    F -- Cart --> G

    G -- No --> H[Login / Register]
    H --> I[Auth via Supabase]
    I --> F

    G -- Yes --> J[Wishlist / Cart Updated]

    J --> K[Proceed to Checkout]
    K --> L[Select / Add Address]
    L --> M[Apply Coupon / Reward Points]
    M --> N[Payment Page]
    N --> O[Simulated Payment\nCard · UPI · Wallet]
    O --> P{Payment OK?}

    P -- Fail --> N
    P -- Success --> Q[create_order RPC\nServer-side price validation]
    Q --> R[Order Confirmed ✓]
    R --> S[Order History / Order Detail]
```

## Flow Summary

| Stage | Detail |
|---|---|
| **Browse** | Home, Catalogue, Book Detail — open to all users, no login required |
| **Auth Gate** | Wishlist, Cart, Checkout, Orders and Profile are protected by `AuthGuard` |
| **Login / Register** | Email + password via Supabase Auth; redirected back after sign-in |
| **Checkout** | Linear 3-step funnel — Address → Coupon/Rewards → Payment |
| **Payment** | Simulated client-side (`paymentSimulator.ts`) — Card, UPI, Wallet |
| **Order Creation** | Committed via `create_order` RPC; server re-validates prices from DB |
| **Post-Order** | Confirmation page → Order History / Order Detail |
