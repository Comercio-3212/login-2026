import http from "node:http";
import https from "node:https";

const ORIGIN = new URL("https://ngc-consultas-y-reclamos-1gatrk.v2.appdeploy.ai");
const PORT = Number(process.env.PORT || 8080);

const server = http.createServer((req, res) => {
  if (req.url === "/healthz") {
    res.writeHead(200, { "content-type": "text/plain; charset=utf-8" });
    res.end("ok");
    return;
  }

  const headers = { ...req.headers, host: ORIGIN.host };
  const opts = {
    hostname: ORIGIN.hostname,
    port: 443,
    method: req.method,
    path: req.url,
    headers,
  };

  const upstream = https.request(opts, (upstreamRes) => {
    const outHeaders = { ...upstreamRes.headers };
    if (outHeaders.location) {
      try {
        const loc = new URL(outHeaders.location, ORIGIN);
        if (loc.hostname === ORIGIN.hostname) {
          outHeaders.location = `https://${req.headers.host}${loc.pathname}${loc.search}${loc.hash}`;
        }
      } catch {}
    }
    res.writeHead(upstreamRes.statusCode || 502, outHeaders);
    upstreamRes.pipe(res);
  });

  upstream.on("error", (err) => {
    console.error(err);
    if (!res.headersSent) res.writeHead(502, { "content-type": "text/plain; charset=utf-8" });
    res.end("Proxy error");
  });

  req.pipe(upstream);
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`NGC proxy listening on ${PORT}`);
});
