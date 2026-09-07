# ReviewExpress - AI-Powered NFC & QR Google Review SaaS Platform

ReviewExpress is a full-stack, mobile-first SaaS platform designed for local businesses to convert in-store foot traffic into authentic 5-star Google Reviews using NFC tap cards and QR code counter standees.

## Key Features

- **Smart Star Routing (Review Gating)**:
  - **⭐⭐⭐⭐⭐ (3 to 5 Stars)**: Routes directly to Google Reviews. Customers get authentic 2-sentence AI-generated reviews tailored to business highlights with 1-tap clipboard copying and direct write-review modal launch.
  - **⭐⭐ (1 to 2 Stars)**: Intercepts dissatisfied customers with a private feedback form capturing their complaint and phone number directly for internal management resolution without exposing public Google Maps.
- **AI Review Generator**: Integrated with Google Gemini 1.5 Flash API to generate diverse, natural, and authentic customer testimonials based on custom store tags.
- **Instant Standee Generator**: Built-in high-resolution QR code counter standee page (/qr/[slug]) ready for printing in restaurants, studios, auto garages, and retail shops.
- **Full-Stack Architecture**: Next.js 14 (App Router), TypeScript, Tailwind CSS, Lucide Icons, and Supabase PostgreSQL with Row Level Security (RLS).
- **Pre-Configured Jaipur Businesses**:
  1. **Photify Studios** (/r/photify-studios)
  2. **Jeep Center & Hind Automobile** (/r/jeep-center)
  3. **Butterfly Bangles** (/r/butterfly-bangles)

---

## Tech Stack

- **Framework**: Next.js 14+ (App Router, Server & Client Components)
- **Language**: TypeScript
- **Styling**: Tailwind CSS, Lucide React Icons
- **AI Engine**: Google Gemini 1.5 Flash (via REST API)
- **Database**: Supabase PostgreSQL with Row Level Security (RLS)
- **QR Code Generation**: Node qrcode library

---

## Getting Started

### 1. Clone & Install Dependencies

`ash
git clone https://github.com/kumawatgaurav203-lang/ReviewExpress.git
cd ReviewExpress
npm install
`

### 2. Configure Environment Variables

Create a .env.local file in the root directory:

`env
GEMINI_API_KEY=your_gemini_api_key_here
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
`

### 3. Setup Supabase Database Schema

Run the SQL migration located at supabase/schema.sql in your Supabase SQL Editor to create the usinesses and eview_logs tables with sample seed data.

### 4. Run Development Server

`ash
npm run dev
`

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Application Routes

| Route | Purpose |
|---|---|
| / | Landing directory showcasing active business links and QR standees |
| /r/[slug] | Mobile customer NFC / QR review flow |
| /qr/[slug] | Printable tabletop counter standee with high-res QR code |
| /api/generate-review | Gemini AI route for generating tailored 2-sentence reviews |
| /api/submit-feedback | Supabase logging route for analytics & private complaints |

---

## License

MIT License
