const httpProxy = require("http-proxy");
const http = require("http");
const fs = require("fs");
const path = require("path");
const fsp = fs.promises;
const objectHash = require("object-hash");

const defaultMappers = {
  mapRequestHeaders: (headers) => headers,
  mapResponseHeaders: (headers) => headers,
};

function ProxyRecorder({ recordPath, target, port, mappers = defaultMappers }) {
  const { mapRequestHeaders, mapResponseHeaders } = Object.assign(
    defaultMappers,
    mappers
  );

  const proxy = httpProxy.createProxyServer({
    target,
    http: true,
    secure: false,
    changeOrigin: true,
  });

  var server = http
    .createServer(async function (req, res) {
      const data = {
        url: req.url,
        headers: mapRequestHeaders(req.headers),
        body: await mapBody(req),
      };

      const hash = objectHash(data);
      req.recHash = hash;
      const reqResPath = path.resolve(recordPath, req.recHash);

      try {
        await fsp.mkdir(reqResPath);
      } catch (err) {}

      await fsp.writeFile(
        path.resolve(reqResPath, "request.json"),
        JSON.stringify(data, null, 2)
      );

      proxy.web(req, res, {
        target,
      });
    })
    .listen(port);

  proxy.on("proxyRes", async (proxyRes, req, res) => {
    const data = {
      body: await mapBody(proxyRes),
      headers: mapResponseHeaders(proxyRes.headers),
    };

    const reqResPath = path.resolve(recordPath, req.recHash);

    await fsp.writeFile(
      path.resolve(reqResPath, "response.json"),
      JSON.stringify(data, null, 2),
      "utf-8"
    );
  });

  return server;
}

async function mapBody(stream) {
  const str = await buffer(stream);

  try {
    const parsed = JSON.parse(str);
    return parsed;
  } catch (err) {
    return str;
  }
}

function buffer(stream) {
  return new Promise(function (resolve, reject) {
    var data = [];

    stream.on("data", function (buf) {
      data.push(buf.toString("utf-8"));
    });

    stream.on("error", function (err) {
      reject(err);
    });

    stream.on("end", function () {
      resolve(data.join(""));
    });
  });
}

const omitKeys = (obj, keys) => {
  return Object.keys(obj).reduce((acc, key) => {
    if (keys.includes(key)) {
      return acc;
    }
    acc[key] = obj[key];
    return acc;
  }, {});
};

module.exports = {
  ProxyRecorder,
  omitKeys,
};
