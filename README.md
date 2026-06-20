# employment-dashboard
# 🏢 WorkForce – Employment Management Dashboard

A full-stack **Employee Management System** built with **Angular** and **ASP.NET Core (.NET 9)**, backed by **PostgreSQL**. WorkForce streamlines day-to-day HR operations — employee records, attendance, leave management, and reporting — through a clean, role-based dashboard for **Admins**, **Managers**, and **Employees**.

![Angular](https://img.shields.io/badge/Angular-20-DD0031?logo=angular&logoColor=white)
![.NET](https://img.shields.io/badge/.NET-9.0-512BD4?logo=dotnet&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15+-336791?logo=postgresql&logoColor=white)

---

## 📑 Table of Contents

- [About the Project](#-about-the-project)
- [Screenshots](#-screenshots)
- [Key Features](#-key-features)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
  - [Prerequisites](#prerequisites)
  - [Database Setup](#1-database-setup)
  - [Backend Setup](#2-backend-setup-aspnet-core-api)
  - [Frontend Setup](#3-frontend-setup-angular)
- [Default Login Credentials](#-default-login-credentials)
- [Roles & Permissions](#-roles--permissions)
- [API Documentation](#-api-documentation)
- [Roadmap](#-roadmap)
- [Contributing](#-contributing)
- [Author](#-author)

---

## 📖 About the Project

**WorkForce** is a complete Employment Management Dashboard designed to digitize core HR workflows for small and mid-sized organizations. It supports three role-based portals (Admin, Manager, Employee) and covers the full employee lifecycle — from onboarding and attendance tracking to leave approvals and exportable reports.

The project was built as a final-year / portfolio project to demonstrate full-stack development skills: secure authentication (JWT), relational database design, RESTful API architecture, and a modern, responsive Angular UI with a glassmorphism-based design system.

---

## 📸 Screenshots

### Authentication
| Login Page |
|---|
| <img width="1599" height="721" alt="image" src="https://github.com/user-attachments/assets/50b974d7-d6b5-4302-8ded-afa19bc3daf9" />
 

### Admin Portal
| Admin Dashboard | Employee Management |
|---|---|
|<img width="1600" height="728" alt="image" src="https://github.com/user-attachments/assets/9ae7bba5-a842-44dd-b1ba-0ba78003fef7" />| <img width="1600" height="716" alt="WhatsApp Image 2026-06-20 at 16 34 45" src="https://github.com/user-attachments/assets/e3f10bb0-2375-4451-b440-9e57c5ecad24" />

| Add / Edit Employee | Attendance Tracking |
|---|---|
| <img width="1600" height="729" alt="WhatsApp Image 2026-06-20 at 16 46 15" src="https://github.com/user-attachments/assets/8c021c6a-6d4d-4bb5-9843-0265f6f74103" />| <img width="1600" height="726" alt="WhatsApp Image 2026-06-20 at 16 38 08" src="https://github.com/user-attachments/assets/04989b05-164f-4309-aa71-8b15c008b68a" />

| Leave Management | Reports & Export |
|---|---|
| <img width="1599" height="733" alt="WhatsApp Image 2026-06-20 at 15 50 53" src="https://github.com/user-attachments/assets/360f5278-81e5-4fac-a4fe-94470219f1a1" />| <img width="1600" height="726" alt="WhatsApp Image 2026-06-20 at 16 36 17" src="https://github.com/user-attachments/assets/47f08cb7-bd4c-4e65-ae36-87b1226b02f9" />


| Geo-Fencing Settings | Audit Logs |
|---|---|
| <img width="1600" height="740" alt="WhatsApp Image 2026-06-20 at 15 56 03" src="https://github.com/user-attachments/assets/61adaa2e-6ddb-4d7b-b59b-a348fa81dc81" /> | <img width="1600" height="712" alt="WhatsApp Image 2026-06-20 at 16 39 13" src="https://github.com/user-attachments/assets/63a1451a-5f09-4b29-89d2-f89e9b86acd7" />

 
### Manager Portal
| Manager Dashboard | Team View |
|---|---|
| <img width="1600" height="697" alt="WhatsApp Image 2026-06-20 at 15 53 47" src="https://github.com/user-attachments/assets/6506dc4d-fc10-4708-aaa9-a0ddefa62ac5" />| <img width="1600" height="716" alt="WhatsApp Image 2026-06-20 at 15 51 43" src="https://github.com/user-attachments/assets/3bb273ca-8c1f-4816-83f5-20365ba93baa" />


### Employee Portal
| Employee Dashboard | My Attendance | My Leave |
|---|---|---|
|<img width="1600" height="713" alt="WhatsApp Image 2026-06-20 at 15 46 42" src="https://github.com/user-attachments/assets/ffcdefba-8dde-4297-bdb3-b8368a501b75" /> | <img width="1600" height="689" alt="WhatsApp Image 2026-06-20 at 16 33 35" src="https://github.com/user-attachments/assets/b51a0964-0354-4d7c-8efa-ed6b0aa20d80" /> | <img width="1599" height="730" alt="WhatsApp Image 2026-06-20 at 16 42 16" src="https://github.com/user-attachments/assets/4a34ac7e-b72c-4b39-9bc8-dda110282872" />


| Profile | Settings |
|---|---|
| <img width="1600" height="726" alt="WhatsApp Image 2026-06-20 at 16 40 36" src="https://github.com/user-attachments/assets/6fff464f-ecfa-484d-ac91-676b12f72c72" />|  <img width="1600" height="744" alt="WhatsApp Image 2026-06-20 at 16 41 04" src="https://github.com/user-attachments/assets/995610c5-c26e-4da8-8de2-a6dbef0ef550" />


```
employment-dashboard/
├── backend/
├── frontend/
├── database/
└── README.md
```

---

## ✨ Key Features

### 👤 Authentication & Access Control
- Secure JWT-based login with BCrypt password hashing
- Role-based access control — **Admin**, **Manager**, **Employee**
- Manager-scoped visibility (managers only see their own department)
- Inactive-user read-only mode

### 🧑‍💼 Employee Management
- Add, edit, and view employee profiles with multi-step forms
- Auto-generated employee codes and phone number validation
- Soft delete support for employee records
- Profile picture upload

### 🕒 Attendance Management
- Geo-fencing based check-in/check-out across up to 4 configurable office locations with GPS validation
- Calendar-style attendance roster with presence codes (P, L, OD, HD, OT, A, CL, ML, PL, UL, OL, WO, H)
- Stacked-bar daily attendance chart on the Admin Dashboard with leave-type breakdowns

### 🌴 Leave Management
- Monthly leave balance limits per leave type
- Approval hierarchy: Employee → Manager → Admin (self-approval blocked)
- Leave cancellation workflow

### 📊 Reporting & Exports
- PDF and Excel export for Employee, Attendance, Leave, and Roster data

### ⚙️ Settings & Extras
- Theme switching (light/dark)
- Emergency contact management
- In-app feedback system
- Audit logs and notifications

---

## 🛠 Tech Stack

**Frontend**
- Angular 20 (Standalone Components)
- Angular Material
- Chart.js
- RxJS, TypeScript

**Backend**
- ASP.NET Core 9 Web API
- Entity Framework Core 9 (Code-First Migrations)
- JWT Bearer Authentication
- BCrypt.Net for password hashing
- QuestPDF / iTextSharp for PDF generation
- ClosedXML for Excel export
- Swashbuckle (Swagger / OpenAPI)

**Database**
- PostgreSQL 15+ (via Npgsql.EntityFrameworkCore.PostgreSQL)

---

## 📁 Project Structure

```
employment-dashboard/
├── backend/
│   └── EmploymentDashboard.API/
│       ├── Controllers/        # API endpoints (Auth, Employees, Attendance, Leave, Reports...)
│       ├── DTOs/                # Request/response data transfer objects
│       ├── Models/              # EF Core entity models
│       ├── Data/                # AppDbContext
│       ├── Repositories/        # Repository pattern (Employee, Leave)
│       ├── Services/            # Business logic (Auth, JWT, Audit logging)
│       ├── Helpers/             # PDF/Excel report generators, password hashing
│       └── Migrations/          # EF Core migrations
├── frontend/
│   └── employment-dashboard-ui/
│       └── src/app/
│           ├── core/            # Services, guards, interceptors, models
│           ├── features/        # Admin / Manager / Employee feature modules
│           └── shared/          # Reusable components, directives, pipes
├── database/                    # SQL schema + seed scripts
```

---

## 🚀 Getting Started

### Prerequisites

Make sure you have the following installed:

| Tool | Version |
|---|---|
| [.NET SDK](https://dotnet.microsoft.com/download) | 9.0+ |
| [Node.js](https://nodejs.org/) | 18+ (LTS recommended) |
| [Angular CLI](https://angular.dev/tools/cli) | 20+ |
| [PostgreSQL](https://www.postgresql.org/download/) | 15+ |

---

### 1. Database Setup

1. Create a new PostgreSQL database:
   ```sql
   CREATE DATABASE "EmploymentDashboardDB";
   ```
2. Run the SQL scripts from the `database/` folder **in order**:
   ```bash
   psql -U postgres -d EmploymentDashboardDB -f database/01_schema.sql
   psql -U postgres -d EmploymentDashboardDB -f database/02_seed_roles.sql
   psql -U postgres -d EmploymentDashboardDB -f database/03_seed_departments.sql
   psql -U postgres -d EmploymentDashboardDB -f database/04_seed_admin.sql
   psql -U postgres -d EmploymentDashboardDB -f database/05_seed_demo_users.sql
   # ...continue through the remaining numbered scripts
   ```
   > Alternatively, skip manual scripts and let EF Core migrations create the schema (see step 2 below), then run only the `*_seed_*.sql` files for sample data.

---

### 2. Backend Setup (ASP.NET Core API)

```bash
cd backend/EmploymentDashboard.API
```

1. Update the connection string and JWT key in `appsettings.json`:
   ```json
   {
     "ConnectionStrings": {
       "DefaultConnection": "Host=localhost;Port=5432;Database=EmploymentDashboardDB;Username=postgres;Password=YOUR_PASSWORD"
     },
     "Jwt": {
       "Key": "YourSuperSecretKeyMinimum32CharactersLong!",
       "Issuer": "EmploymentDashboardAPI",
       "Audience": "EmploymentDashboardClient"
     }
   }
   ```
2. Restore dependencies and apply migrations:
   ```bash
   dotnet restore
   dotnet ef database update
   ```
3. Run the API:
   ```bash
   dotnet run
   ```
4. The API will be available at `https://localhost:7xxx` (check the console output) with Swagger UI at `/swagger`.

---

### 3. Frontend Setup (Angular)

```bash
cd frontend/employment-dashboard-ui
npm install
```

1. Update the API base URL in `src/environments/environment.ts` to match your backend port.
2. Start the dev server:
   ```bash
   npm start
   ```
3. Open your browser at **http://localhost:4200**.

---

## 🔑 Default Login Credentials

> ⚠️ These are seed/demo accounts for local testing only. Change or remove them before deploying to production.

| Role | Username | Password |
|---|---|---|
| Admin | `admin` | `Admin@123` |

---

## 🧭 Roles & Permissions

| Capability | Admin | Manager | Employee |
|---|:---:|:---:|:---:|
| Manage all employees | ✅ | ❌ | ❌ |
| View/manage own department's team | ✅ | ✅ | ❌ |
| Approve/reject leave requests | ✅ | ✅ (own team) | ❌ |
| Apply for leave | ✅ | ✅ | ✅ |
| Check-in / check-out attendance | ✅ | ✅ | ✅ |
| View attendance roster | ✅ (all) | ✅ (team) | ✅ (self) |
| Generate reports (PDF/Excel) | ✅ | ✅ | ❌ |
| Configure geo-fencing locations | ✅ | ❌ | ❌ |
| View audit logs | ✅ | ❌ | ❌ |

---

## 📘 API Documentation

Once the backend is running, interactive API documentation is available via Swagger:

```
https://localhost:<port>/swagger
```

Core endpoint groups include `Auth`, `Employees`, `Attendance`, `Leave`, `Departments`, `Reports`, `Roster`, `Holiday`, `Notifications`, `AuditLogs`, `Settings`, and `Profile`.

---

## 🗺 Roadmap

- [ ] Email notifications for leave approvals
- [ ] Mobile-responsive PWA support
- [ ] Biometric/face-recognition attendance integration
- [ ] Payroll module
- [ ] Multi-language support

---

## 🤝 Contributing

Contributions are welcome! If you'd like to improve this project:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/your-feature`)
3. Commit your changes (`git commit -m 'Add some feature'`)
4. Push to the branch (`git push origin feature/your-feature`)
5. Open a Pull Request

---

## 👨‍💻 Author

**Srimathi**
If you found this project useful, consider giving it a ⭐ on GitHub!
