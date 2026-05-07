import { createReadStream } from "node:fs";
import { createServer } from "node:http";
import { extname} from "node:path";

const port = Number(process.env.PORT || 8000);

const contentTypes = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
};

const server = createServer((request, response) => {
    response.writeHead(200, {
        "content-type": contentTypes[extname(request.url)] || "application/octet-stream",
    });
    createReadStream(request.url).pipe(response);
});

server.listen(port, () => {
    console.log(`Bomberman DOM running at http://localhost:${port}/`);
});
