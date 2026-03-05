const http = require("http");

function createHttpServer({ port, db }) {
  const server = http.createServer(async (req, res) => {
    try {
      if (req.method === "GET" && req.url === "/health") {
        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify({ status: "ok" }));
        return;
      }

      if (req.method === "GET" && req.url === "/db/health") {
        const health = await db.health();
        res.writeHead(health.ready ? 200 : 503, { "content-type": "application/json" });
        res.end(JSON.stringify(health));
        return;
      }

      res.writeHead(404, { "content-type": "application/json" });
      res.end(JSON.stringify({ error: "Not found" }));
    } catch (error) {
      res.writeHead(500, { "content-type": "application/json" });
      res.end(JSON.stringify({ error: "Internal server error" }));
    }
  });

  return {
    start() {
      return new Promise((resolve) => {
        server.listen(port, () => resolve(server));
      });
    },
    stop() {
      return new Promise((resolve, reject) => {
        server.close((error) => {
          if (error) {
            reject(error);
            return;
          }
          resolve();
        });
      });
    }
  };
}

module.exports = {
  createHttpServer
};
