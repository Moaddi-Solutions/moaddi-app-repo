# Moaddi Platform — Development Progress Report
### Phase One — updates and improvements delivered

---

## Overview

This report summarizes the developments made to the Moaddi platform during Phase One. Over this phase the platform advanced significantly across all three of its applications — the customer-facing website, the mobile app, and the system that powers them behind the scenes — moving from an early state to a dependable, production-ready product.

Moaddi is a smart-vending commerce platform. A customer can discover the products inside a vending machine, pay through multiple payment methods in their own local currency, and receive their items — while machine owners and field staff manage their inventory, track their earnings, and withdraw their money, and administrators oversee the entire operation from a single control center.

The work below describes what now exists as a result of Phase One's development.

---

## What was delivered

### The customer experience (web & mobile)
The storefront — available both as a website and as a dedicated mobile app for iPhone and Android — was advanced so that a customer can now:
- Scan or select a vending machine and browse everything inside it.
- See live product availability and prices, automatically shown **in their own currency**.
- Pay securely through their preferred payment method.
- Connect to the machine **directly over Bluetooth** from their phone, or complete the purchase through the network — and watch in real time as the machine opens the right compartment and dispenses their product.
- Receive a proper invoice for every purchase.

### The operator & staff tools
The tools for the people who run the machines — vendors, field staff, and operators — were extended so they can now:
- Stock and refill machines in the field directly from their mobile phone.
- Track their sales and earnings in a personal **digital wallet**.
- Request **withdrawals** of their money and follow each request through to completion.
- Manage their machines and the products inside them.

### The administration control center
The back-office dashboard gained full oversight and control of the operation:
- A complete view of every payment, every invoice, and every transaction across the platform.
- Management of products, machines, customers, and vendors.
- Configuration of **platform fees** — the commission the business earns on each sale.
- Control over which payment methods are available, and on which machines.

---

## The major developments

### A dual-payment system
The platform now accepts payments through **two independent payment providers side by side** — one serving international card payments and one serving the Saudi and Gulf market — and either can be assigned to any individual machine.

The payment process was made genuinely trustworthy: the system independently confirms with the payment provider that money has actually arrived **before** any product is dispensed, and it handles every situation along the way — payments still being processed, partial amounts, retries, and failures — so a customer is never charged for something they don't receive, and the business is never out of pocket for product it gave away. The payment system was structured so that adding further payment providers in future is straightforward.

### Real multi-currency support
Prices are now converted using **live, up-to-date exchange rates** and displayed correctly formatted in the right currency. The system can also **detect a customer's country automatically** and default to the appropriate currency — the foundation that allows Moaddi to operate across borders.

### A vendor wallet and payout system
A complete money-management capability was added so the people stocking the machines can see exactly what they've earned, watch their balance grow with each sale, and request payouts — with the business applying its commission on every transaction. This established Moaddi as a genuine **two-sided marketplace** with its own internal economy.

### Two ways to operate the machines
The platform now offers **two complete, independent methods** for a customer or staff member to operate a machine: directly over **Bluetooth** when standing in front of it, and over the **internet** through a central gateway. Both work in real time, so the moment a payment clears, the correct compartment opens and the customer sees it happen live on their screen.

### Sign-in over WhatsApp
Account verification now uses **WhatsApp** to deliver one-time security codes — a fast, familiar, and trusted channel for the platform's market, removing friction from signing up and logging in.

### Full Arabic & English support
The entire platform — every screen and every message, on both web and mobile — is now available in **both Arabic and English**, including proper right-to-left layout for Arabic.

### Saudi e-invoicing compliance
The system now generates compliant invoices, including the **official QR-code format required by Saudi tax regulations**, so the business operates within local law.

---

## Reliability and refinement

Alongside the new capabilities, a significant share of Phase One went into making the platform robust enough for real customers and real money. Among the improvements:

- **Reliable sign-in and navigation.** The sign-in and navigation experience was rebuilt so every user — customer, staff, or admin — always arrives exactly where they should, with no loops or wrong turns, and logging out cleanly and completely ends the session.
- **Dependable checkout.** The path from "pay" to "receive your invoice" was hardened so a customer always gets a correct invoice, the screen always reflects what the machine is actually doing, and any connection issue is communicated clearly rather than failing silently.
- **Accurate pricing.** Subtle cases where a price could display incorrectly or as missing were resolved, so customers always see the right amount in the right currency.
- **Dependable machine stocking.** The logic that maps products to a machine's physical compartments was rebuilt to stay accurate even when a machine's size or layout changes.
- **A better experience on real phones.** The Bluetooth connection was refined to be faster, more reliable, and gentler on battery life, with clear permission prompts.
- **Polished presentation.** Missing product images now fall back gracefully to placeholders instead of showing broken graphics, keeping the storefront clean.

### Foundations for growth
The period also strengthened the parts of the platform that are rarely seen but always matter: a **professional release process** so new versions can be deployed safely and automatically, secure communication between every part of the system, and ongoing modernization of the underlying code to keep it fast and maintainable. These foundations allow the platform to expand — more machines, more regions, more features — on solid ground.

---

## In perspective

Across Phase One the platform advanced on every front at once: three applications working together — a website, a mobile app, and the system behind them that communicates with physical hardware — gained real payment processing through two providers, live multi-currency pricing, a vendor payout economy, real-time machine control by two separate methods, full Arabic and English support, and regulatory-compliant invoicing.

What was an early-stage product at the start of Phase One is now a secure, internationalized, multi-currency commerce platform ready for real customers — and a strong foundation for the next phase of the business.

---

*Prepared as a non-technical summary of the platform's development progress.*
