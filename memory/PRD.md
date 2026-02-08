# Weekly Bakery Shop PRD

## Original Problem Statement
URL that I can send to people for an online shop with 5 to 10 customizable options on a weekly basis. Have an option that auto sells out once a certain number that I can customize each week that doesn't allow to submit an order once it sold out, and it shows up as sold out. When people do place their order, they get an email saying thank you for your order with the info that I can customize for how to pay and when to come pick up their item.

## User Personas
1. **Shop Owner (Admin)**: Manages weekly product listings, sets quantities/prices, customizes pickup/payment info, views orders
2. **Customer**: Browses weekly offerings, adds items to cart, places orders, receives confirmation emails

## Core Requirements
- [x] Weekly product listings (5-10 items)
- [x] Customizable inventory limits per product
- [x] Auto sell-out when quantity reaches 0
- [x] "Sold Out" visual indicator
- [x] Order form (name, email, phone, notes)
- [x] Email confirmation with pickup/payment info
- [x] Admin panel with password protection
- [x] Product management (CRUD)
- [x] Settings management (shop name, pickup info, payment info)
- [x] Order management

## Architecture
- **Frontend**: React + Tailwind CSS + shadcn/ui
- **Backend**: FastAPI + MongoDB
- **Email**: Emergent LLM integration (generates personalized emails, logged to DB)

## What's Been Implemented (Feb 8, 2026)
1. **Shop Page** (`/`)
   - Product grid with images, prices, stock counts
   - Sold out badges and greyed styling
   - Cart sidebar with quantity controls
   - Order form with validation
   - Success page with pickup/payment details

2. **Admin Panel** (`/admin`)
   - Password protection (default: bakery2024)
   - Products tab: Add/edit/delete products, quick quantity updates, toggle active
   - Orders tab: View all orders, mark complete/cancelled
   - Settings tab: Shop name, weekly date, pickup info, payment info, email message

3. **Backend APIs**
   - Products: GET/POST/PUT/DELETE
   - Orders: POST (with quantity reduction), GET, status updates
   - Settings: GET/PUT
   - Admin login

## Prioritized Backlog
### P0 (Critical) - DONE
- [x] Core shopping flow
- [x] Admin product management
- [x] Sell-out functionality

### P1 (Important)
- [ ] Actual email delivery (currently logged to DB)
- [ ] Reset all quantities button for new week
- [ ] Order export (CSV)

### P2 (Nice to Have)
- [ ] Product categories
- [ ] Order history for returning customers
- [ ] Multiple pickup time slots
- [ ] Analytics dashboard

## Next Tasks
1. Integrate actual email service (SendGrid/Resend) for real delivery
2. Add "Reset Week" button to quickly restock all products
3. Add order export functionality
