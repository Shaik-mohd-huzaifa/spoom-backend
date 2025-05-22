# Spoom AI Backend

This is the backend server for the Spoom AI application, built with Node.js and Express.

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm (v6 or higher) or yarn

### Installation

1. Clone the repository
2. Install dependencies:

```bash
npm install
```

3. Create a `.env` file in the root directory with the following variables:

```
PORT=5000
NODE_ENV=development
```

### Available Scripts

- `npm start` - Start the production server
- `npm run dev` - Start the development server with hot-reload
- `npm test` - Run tests (to be implemented)
- `npm run lint` - Lint the code
- `npm run format` - Format the code

## API Endpoints

### Examples

- `GET /api/examples` - Get all examples
- `POST /api/examples` - Create a new example

## Project Structure

```
backend/
├── src/
│   ├── controllers/    # Route controllers
│   ├── routes/         # Route definitions
│   ├── app.js          # Express application
│   └── server.js       # Server entry point
├── .env                # Environment variables
├── .gitignore          # Git ignore file
└── package.json        # Project dependencies and scripts
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the ISC License - see the [LICENSE](LICENSE) file for details.
