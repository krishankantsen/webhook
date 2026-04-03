# HookCapture - Webhook Testing Tool

A modern webhook testing application built with Next.js that allows you to create endpoints and capture incoming webhooks in real-time.

## Features

- Create custom webhook endpoints with configurable responses
- Capture and inspect incoming requests (headers, body, query parameters)
- Real-time request monitoring
- Custom response status codes and headers
- Database persistence with Neon
- Modern React UI with Tailwind CSS

## Tech Stack

- **Frontend**: Next.js 14, React 18, TypeScript
- **Styling**: Tailwind CSS
- **Database**: Neon (PostgreSQL)
- **Icons**: Lucide React
- **Animations**: Motion

## Getting Started

### Prerequisites

- Node.js 18+
- A Neon database account and connection string

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd webhook
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   Create a `.env.local` file in the root directory and add your Neon database URL:
   ```
   DATABASE_URL=your_neon_database_connection_string
   ```

4. Run the development server:
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

1. **Create an Endpoint**: Click the "+" button to create a new webhook endpoint
2. **Configure Response**: Set the response status, headers, and body
3. **Get Webhook URL**: Copy the unique URL for your endpoint
4. **Send Requests**: Use tools like curl, Postman, or your application to send requests to the webhook URL
5. **Monitor Requests**: View captured requests in real-time with full details

## API Routes

- `GET /api/endpoints` - List all endpoints
- `POST /api/endpoints` - Create a new endpoint
- `PATCH /api/endpoints/[id]` - Update an endpoint
- `DELETE /api/endpoints/[id]` - Delete an endpoint
- `GET /api/endpoints/[id]/requests` - Get requests for an endpoint
- `ALL /webhook/[id]` - Webhook capture endpoint
- `GET /api/health` - Health check

## Building for Production

```bash
npm run build
npm start
```

## Database Schema

The application uses two main tables:

### endpoints
- `id` (TEXT, PRIMARY KEY)
- `name` (TEXT)
- `responsestatus` (INTEGER)
- `responsebody` (TEXT)
- `responseheaders` (TEXT)
- `createdat` (TEXT)
- `expiresat` (TEXT)

### requests
- `id` (TEXT, PRIMARY KEY)
- `endpointid` (TEXT, FOREIGN KEY)
- `method` (TEXT)
- `headers` (TEXT)
- `body` (TEXT)
- `query` (TEXT)
- `timestamp` (TEXT)
- `ip` (TEXT)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License
