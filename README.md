# FarmDirect 🌾

A full-stack farmer-to-customer e-commerce platform that lets farmers list produce directly and customers order it, cutting out middlemen.

## Features
- **Farmer dashboard** — add/edit/delete product listings (name, price, stock, unit); stock updates reflect live on the customer browse page.
- **Customer browse & order flow** — browse live listings, place orders. Stock is decremented atomically at order time so two customers can't oversell the last unit.
- **Admin dashboard** — manage registered users, product listings, and orders (including order status updates).
- **Auth** — session-based login/registration with hashed passwords (bcrypt) and role-based access control (farmer / customer / admin).

## Tech Stack
- **Backend:** Node.js, Express
- **Database:** MongoDB with Mongoose
- **Frontend:** HTML, CSS, vanilla JavaScript (single-page app, no framework)
- **Auth:** express-session + connect-mongo (sessions stored in MongoDB), bcryptjs for password hashing

## Project Structure
```
FarmDirect/
├── models/          # Mongoose schemas: User, Product, Order
├── routes/          # Express routes: auth, products, orders, admin
├── middleware/       # requireLogin / requireRole auth guards
├── public/           # Frontend: index.html, css, js
├── server.js          # App entry point
└── .env.example       # Environment variable template
```

## Setup

1. Install dependencies:
   ```
   npm install
   ```
2. Make sure MongoDB is running locally (or update `MONGO_URI` to point to Atlas/a remote instance).
3. Copy `.env.example` to `.env` and fill in your values:
   ```
   cp .env.example .env
   ```
4. Start the server:
   ```
   npm start
   ```
5. Visit `http://localhost:3000`

## How the roles work
- Register as a **Farmer** to add and manage product listings.
- Register as a **Customer** to browse and place orders.
- The first **Admin** account needs to be created manually (e.g. via `mongosh` update a user's `role` field to `"admin"`), since admin signup isn't exposed publicly for security reasons.

## Notes / Design Decisions
- MongoDB was chosen over a relational DB because product listings can vary in shape across farmers, and a document store avoided rigid schema migrations during rapid iteration.
- Stock decrement on order uses `findOneAndUpdate` with a `stock >= quantity` condition, making the check-and-decrement atomic at the database level rather than doing a separate read-then-write (which would be vulnerable to a race condition).
- Passwords are never stored in plain text — hashed with bcrypt before saving.

## Possible Improvements
- Payment gateway integration
- Image uploads for product listings
- Email notifications on order status changes
