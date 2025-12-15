# City Vault 🏛️

A modern, secure file storage application built on IPFS (InterPlanetary File System) with metadata management powered by Neon Postgres. Upload, store, and retrieve your files with the permanence and decentralization of IPFS combined with the convenience of traditional web applications.

## ✨ Features

- **Decentralized Storage**: Files are stored on IPFS via Pinata, ensuring permanent and distributed file hosting
- **User Authentication**: Secure authentication system with NextAuth.js and bcrypt password hashing
- **File Management**: Upload, search, view, and delete files with an intuitive dashboard
- **Metadata Tracking**: Store file metadata (filename, size, MIME type, upload date) in Neon Postgres
- **IPFS Gateway Access**: Direct links to view files through IPFS gateways
- **Modern Stack**: Built with Next.js 16, React 19, TypeScript, and Tailwind CSS

## 🛠️ Tech Stack

### Frontend
- **Framework**: Next.js 16 (App Router)
- **UI Library**: React 19
- **Styling**: Tailwind CSS 4
- **TypeScript**: Full type safety

### Backend
- **API Routes**: Next.js API Routes
- **Authentication**: NextAuth.js 4 with JWT sessions
- **Database**: Neon Postgres (serverless)
- **ORM**: Prisma 7 with Neon adapter
- **File Storage**: IPFS via Pinata Web3 SDK

## 📋 Prerequisites

Before you begin, ensure you have:

- Node.js 20+ installed
- A [Pinata](https://pinata.cloud/) account for IPFS storage
- A [Neon](https://neon.tech/) Postgres database
- npm, yarn, pnpm, or bun package manager

## 🚀 Getting Started

### 1. Clone the Repository

```bash
git clone <your-repo-url>
cd city-vault
```

### 2. Install Dependencies

```bash
npm install
# or
yarn install
# or
pnpm install
```

### 3. Environment Setup

Create a `.env` file in the root directory with the following variables:

```env
# Database
DATABASE_URL="postgresql://username:password@your-neon-db-url/database"

# NextAuth
NEXTAUTH_SECRET="your-nextauth-secret-here"
NEXTAUTH_URL="http://localhost:3000"

# Pinata IPFS
PINATA_JWT="your-pinata-jwt-token"
NEXT_PUBLIC_GATEWAY_URL="your-gateway-url.mypinata.cloud"
```

#### Getting Your Environment Variables:

**DATABASE_URL**: 
- Sign up at [Neon](https://neon.tech/)
- Create a new project and database
- Copy the connection string from your dashboard

**NEXTAUTH_SECRET**: 
```bash
openssl rand -base64 32
```

**PINATA_JWT & NEXT_PUBLIC_GATEWAY_URL**:
- Sign up at [Pinata](https://pinata.cloud/)
- Navigate to API Keys and create a new JWT
- Find your dedicated gateway URL in the Gateways section

### 4. Database Setup

Run Prisma migrations to set up your database schema:

```bash
npx prisma generate
npx prisma db push
```

### 5. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 🎯 Usage

### Registering a New User
1. Navigate to the Register page
2. Enter your name, email, and password
3. Click "Register"

### Uploading Files
1. Log in to your dashboard
2. Click "Choose File" and select a file
3. Click "Upload to IPFS"
4. Your file will be uploaded and pinned to IPFS

### Managing Files
- **View**: Click "View on IPFS" to open the file in a new tab
- **Search**: Use the search bar to filter files by filename
- **Delete**: Click the "Delete" button to remove a file

## 🔒 Security Features

- Password hashing with bcrypt (10 salt rounds)
- JWT-based session management
- Server-side authentication checks
- Protected API routes
- Secure file ownership validation

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the project
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

## 🙏 Acknowledgments

- [Next.js](https://nextjs.org/) - The React framework
- [Pinata](https://pinata.cloud/) - IPFS pinning service
- [Neon](https://neon.tech/) - Serverless Postgres
- [Prisma](https://www.prisma.io/) - Next-generation ORM
- [NextAuth.js](https://next-auth.js.org/) - Authentication for Next.js

## 📧 Support

For support, email swpnlmitra@gmail.com or open an issue in the GitHub repository.

---

Built with ❤️ using Next.js and IPFS
