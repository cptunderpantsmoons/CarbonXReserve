# CarbonXReserve Frontend - User Registration UI

A React-based frontend application for user registration and KYC verification in the CarbonXReserve carbon trading platform.

## Features

- **Organization Registration Form**: Collect organization details including name, type, contact information, and address
- **Personal KYC Form**: Gather personal information for Know Your Customer verification
- **Document Upload**: Upload ID documents and proof of address with progress indicators
- **KYC Status Display**: Show verification status (Pending, Approved, Rejected)
- **Form Validation**: Client-side validation with error messages
- **Responsive Design**: Mobile-friendly UI using Tailwind CSS
- **API Integration**: Communicates with backend KYC verification endpoint

## Tech Stack

- **React 19** with TypeScript
- **Tailwind CSS** for styling
- **React Router** for navigation
- **Axios** for API calls
- **Create React App** for build setup

## Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Backend server running on `http://localhost:3000` (or configure `REACT_APP_API_BASE_URL`)

## Installation

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment variables (optional):
   Create a `.env` file in the frontend directory:
   ```
   REACT_APP_API_BASE_URL=http://localhost:3000
   ```

## Usage

1. Start the development server:
   ```bash
   npm start
   ```

2. Open [http://localhost:3000](http://localhost:3000) in your browser

3. Navigate through the application:
   - **Registration (/)**: Fill out organization and personal KYC information
   - **Documents (/documents)**: Upload required documents

## API Integration

The frontend integrates with the backend KYC API:

- **Endpoint**: `POST /kyc/verify`
- **Request**: JSON with user ID, personal details, and document information
- **Response**: KYC status and verification result

## Project Structure

```
frontend/
├── src/
│   ├── components/
│   │   ├── RegistrationForm.tsx    # Main registration form
│   │   ├── DocumentUpload.tsx      # Document upload component
│   │   └── StatusDisplay.tsx       # KYC status display
│   ├── pages/
│   │   ├── Register.tsx            # Registration page
│   │   └── Documents.tsx           # Documents page
│   ├── services/
│   │   └── api.ts                  # API service layer
│   ├── types/
│   │   ├── api.ts                  # API type definitions
│   │   └── forms.ts                # Form type definitions
│   ├── App.tsx                     # Main app with routing
│   └── index.tsx                   # App entry point
├── public/                         # Static assets
└── package.json                    # Dependencies and scripts
```

## Available Scripts

- `npm start`: Start development server
- `npm run build`: Build for production
- `npm test`: Run tests
- `npm run eject`: Eject from Create React App

## Development Notes

- Form validation is implemented client-side
- Document uploads are simulated (backend would need file upload endpoints)
- API calls use Axios with error handling
- Styling uses Tailwind CSS utility classes

## Contributing

1. Follow TypeScript best practices
2. Use functional components with hooks
3. Maintain consistent styling with Tailwind CSS
4. Add proper error handling for API calls
5. Test components thoroughly

## License

This project is part of the CarbonXReserve platform.