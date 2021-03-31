# Example usage

```js
ProxyRecorder({
  target: "https://some-api.com",
  recordPath: __dirname + "/tapes",
  port: 3019,
  mappers: {
    mapRequestHeaders: (headers) => {
      return omitKeys(headers, ["authorization"]);
    },
  },
});
```
