const http = require('http');

module.exports = function(app, httpPort = 3000) {
    // Start HTTP server without redirection
    const httpServer = http.createServer(app);

    httpServer.listen(httpPort, () => {
        console.log(`HTTP server running on port ${httpPort}`);
    });
};
