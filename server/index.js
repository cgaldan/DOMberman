import { createReadStream } from "node:fs";
import { createServer } from "node:http";
import { extname, normalize, join } from "node:path";
import { BombermanServer } from "./game-server.js";

const port = Number(process.env.PORT || 8000);

const contentTypes = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
};

const root = process.cwd();

const server = createServer((request, response) => {
    const url = new URL(request.url, `http://${request.headers.host}`);
    const pathname = url.pathname === "/" ? "/index.html" : url.pathname;
    const filePath = normalize(join(root, pathname));

    const stream = createReadStream(filePath);
    
    stream.on("error", () => {
        response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
        response.end("Not found");
    });

    stream.on("open", () => {
        response.writeHead(200, {
            "content-type": contentTypes[extname(filePath)] || "application/octet-stream",
        });
    });

    stream.pipe(response);
});

const gameServer = new BombermanServer();
gameServer.attach(server);

server.listen(port, () => {
    console.log(`Bomberman DOM running at http://localhost:${port}/`);
});
