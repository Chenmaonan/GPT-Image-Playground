#!/bin/sh

set -eu

case "${RESTRICTED_AGENT_ENABLED:-false}" in
    true)
        # 完整 Gateway 自行执行必填配置和策略上限的 fail-closed 校验。
        exec node dist/server.js
        ;;
    false)
        # 旧模式不加载 Gateway 配置或 API，只保留内部健康检查，避免第二个启用开关。
        exec node -e '
            const http = require("node:http");
            const host = process.env.AGENT_HOST || "0.0.0.0";
            const port = Number(process.env.AGENT_PORT || 3000);
            http.createServer((request, response) => {
              if (request.method === "GET" && request.url === "/healthz") {
                response.writeHead(200, { "content-type": "application/json" });
                response.end("{\"status\":\"disabled\"}");
                return;
              }
              response.writeHead(404);
              response.end();
            }).listen(port, host);
        '
        ;;
    *)
        echo 'Invalid Gateway configuration: RESTRICTED_AGENT_ENABLED must be true or false' >&2
        exit 1
        ;;
esac
