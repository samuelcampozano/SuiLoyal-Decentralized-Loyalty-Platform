# SuiLoyal Frontend

A modern React application for the SuiLoyal decentralized loyalty platform.

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn

### Installation
```bash
npm install
```

### Development
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) to view it in the browser.

### Build
```bash
npm run build
```

### Lint
```bash
npm run lint
```

### Test
```bash
npm run test
```

## 📁 Project Structure

```
src/
├── components/           # Reusable UI components
│   ├── tabs/            # Tab-specific components
│   ├── Navigation.tsx   # Main navigation
│   ├── Notification.tsx # Toast notifications
│   ├── LoadingOverlay.tsx
│   └── Footer.tsx
├── types/               # TypeScript type definitions
├── lib/                # Utility functions
├── config.ts           # Configuration & environment variables
├── App.tsx             # Main application component
└── main.tsx            # Application entry point
```

## 🔧 Configuration

Copy `.env.example` to `.env` and update the values:

```bash
cp .env.example .env
```

Update the contract addresses after deployment:
- `VITE_PACKAGE_ID` - Your deployed package ID
- `VITE_PLATFORM_ID` - Your platform object ID

## 🎯 Features

- **Responsive Design** - Works on desktop and mobile
- **TypeScript** - Full type safety
- **Tailwind CSS** - Modern styling
- **Component Architecture** - Modular and maintainable
- **ESLint & Prettier** - Code quality tools

## 🔮 Future Integrations

The application is prepared for:
- Sui Wallet integration via @mysten/dapp-kit
- Real blockchain interactions
- NFT reward systems
- Multi-merchant networks

## 📝 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `npm run test` - Run tests