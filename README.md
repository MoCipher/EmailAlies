# EmailAlies - Secure Email Aliases

A modern, encrypted email aliasing service that protects your privacy by creating disposable email addresses that forward to your real inbox. Built with end-to-end encryption, cross-device synchronization, and a beautiful modern UI.

## 🚀 Features

- **🔐 End-to-End Encryption**: All emails and user data are encrypted before leaving your device
- **📧 Disposable Aliases**: Create unlimited email aliases for different purposes
- **🌙 Dark/Light Mode**: Modern responsive UI with theme support
- **📱 Cross-Device Sync**: Access your aliases from any device securely
- **🏠 Local Hosting**: Run on your own device or deploy to the cloud
- **🛡️ Privacy First**: No tracking, no data collection, your data stays yours

## 🏗️ Architecture

- **Frontend**: Next.js 16 with TypeScript, Tailwind CSS, and modern React
- **Backend**: Next.js API routes with SQLite database
- **Encryption**: AES-GCM encryption using Web Crypto API
- **Database**: SQLite with better-sqlite3 for local storage
- **Styling**: Tailwind CSS with custom design system

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn

### Local Development

1. **Clone and install dependencies:**
   ```bash
   git clone <repository-url>
   cd emailalies
   npm install
   ```

2. **Initialize the database:**
   ```bash
   npm run db:init
   ```

3. **Start the development server:**
   ```bash
   npm run dev
   ```

4. **Open [http://localhost:3000](http://localhost:3000)**

### Cloudflare Deployment

1. **Install Wrangler CLI:**
   ```bash
   npm install -g wrangler
   ```

2. **Login to Cloudflare:**
   ```bash
   wrangler auth login
   ```

3. **Deploy to Cloudflare Pages:**
   ```bash
   npm run cf:deploy
   ```

## 📁 Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   │   ├── aliases/       # Alias management
│   │   ├── auth/          # Authentication
│   │   └── sync/          # Device synchronization
│   ├── globals.css        # Global styles
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Main dashboard
├── components/            # React components
│   └── ui/               # Reusable UI components
├── database/             # Database layer
│   ├── db.ts            # Database connection and queries
│   └── schema.ts        # TypeScript types
├── lib/                  # Utility libraries
│   ├── encryption.ts    # Encryption utilities
│   ├── sync.ts          # Cross-device sync
│   └── utils.ts         # Helper functions
└── types/               # TypeScript type definitions
```

## 🔐 Security Features

- **Client-Side Encryption**: Emails are encrypted in the browser before transmission
- **Email Verification**: Passwordless authentication using email verification codes
- **AES-GCM Encryption**: Industry-standard encryption for data at rest
- **Service Key Encryption**: Master keys encrypted with service-managed keys
- **Session Management**: Secure token-based authentication

## 🔄 Cross-Device Synchronization

EmailAlies supports secure synchronization across multiple devices:

1. **Device Registration**: Each device gets a unique encryption key
2. **Change Tracking**: All data changes are tracked and encrypted
3. **Conflict Resolution**: Automatic merging of changes between devices
4. **Selective Sync**: Only sync data that's changed since last sync

## 🌐 API Endpoints

### Authentication
- `POST /api/auth/register` - Send verification code for registration
- `POST /api/auth/login` - Send verification code for login
- `POST /api/auth/verify-code` - Verify code and complete authentication

### Aliases
- `GET /api/aliases` - List user aliases
- `POST /api/aliases` - Create new alias
- `PUT /api/aliases/[id]` - Update alias
- `DELETE /api/aliases/[id]` - Delete alias

### Synchronization
- `POST /api/sync` - Sync device data
- `GET /api/sync` - Get device list
- `POST /api/sync/register-device` - Register new device

## 🛠️ Development Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run cf:deploy    # Deploy to Cloudflare Pages
npm run cf:dev       # Cloudflare development mode
npm run db:init      # Initialize database
npm run db:migrate   # Run database migrations
```

## 🔧 Configuration

### Environment Variables

Create a `.env.local` file for local development:

```env
# Get your API key from https://resend.com (free tier available)
RESEND_API_KEY=re_your_resend_api_key_here

# Database (defaults to local SQLite)
DATABASE_URL=./data/emailalies.db

# Development
NODE_ENV=development
```

#### Setting up Email Service

1. **Sign up for Resend**: Go to [resend.com](https://resend.com) and create a free account
2. **Get your API key**: Go to API Keys section in your dashboard
3. **Add to environment**: Copy your API key to `.env.local` as `RESEND_API_KEY`
4. **Verify domain** (optional): For production, verify your domain in Resend dashboard

The app will send beautiful HTML emails with verification codes automatically.

### Cloudflare Configuration

The `wrangler.toml` file contains Cloudflare-specific configuration:

- **Pages Deployment**: Configured for Cloudflare Pages
- **Node.js Compatibility**: Enabled for SQLite support
- **Environment Variables**: Configured for production

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit your changes: `git commit -am 'Add your feature'`
4. Push to the branch: `git push origin feature/your-feature`
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support, please:
1. Check the [Issues](https://github.com/your-repo/issues) page
2. Create a new issue with detailed information
3. Join our community discussions

## 🚨 Security

If you discover any security vulnerabilities, please email security@emailalies.com instead of creating a public issue.

---

**Built with ❤️ for privacy and security**
# Add a small change to force update
# Force update for clean build
