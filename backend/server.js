require('dotenv').config();
const app = require('./src/app');
const config = require('./src/config/config');
const { testConnection } = require('./src/config/database');
const logger = require('./src/utils/logger');

// Test database connection
const startServer = async () => {
  try {
    // Test database connection
    const dbConnected = await testConnection();
    
    if (!dbConnected) {
      logger.error('Failed to connect to database. Exiting...');
      process.exit(1);
    }

    // Start server
    const server = app.listen(config.port, () => {
      logger.info(`
========================================
🚀 Server started successfully!
========================================
Environment: ${config.env}
Port: ${config.port}
API Version: ${config.apiVersion}
Base URL: http://localhost:${config.port}
API URL: http://localhost:${config.port}/api/${config.apiVersion}
Health Check: http://localhost:${config.port}/health
========================================
      `);
    });

    // Graceful shutdown
    const gracefulShutdown = () => {
      logger.info('Received shutdown signal. Closing server gracefully...');
      
      server.close(() => {
        logger.info('Server closed. Exiting process.');
        process.exit(0);
      });

      // Force close after 10 seconds
      setTimeout(() => {
        logger.error('Could not close connections in time, forcefully shutting down');
        process.exit(1);
      }, 10000);
    };

    // Handle shutdown signals
    process.on('SIGTERM', gracefulShutdown);
    process.on('SIGINT', gracefulShutdown);

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (err) => {
      logger.error('Unhandled Promise Rejection:', err);
      gracefulShutdown();
    });

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Start the server
startServer();