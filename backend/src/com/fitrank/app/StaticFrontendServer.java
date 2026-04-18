package com.fitrank.app;

import com.sun.net.httpserver.Headers;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;
import com.sun.net.httpserver.HttpServer;

import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;

public class StaticFrontendServer {
    public static void main(String[] args) throws Exception {
        final String root = args.length > 0 ? args[0] : ".";
        final int port = args.length > 1 ? Integer.parseInt(args[1]) : 5173;
        HttpServer server = HttpServer.create(new InetSocketAddress(port), 0);
        server.createContext("/", new StaticHandler(root));
        server.setExecutor(null);
        server.start();
        System.out.println("Frontend server running on http://localhost:" + port);
    }

    private static class StaticHandler implements HttpHandler {
        private final String root;

        StaticHandler(String root) {
            this.root = root;
        }

        @Override
        public void handle(HttpExchange exchange) throws IOException {
            String path = exchange.getRequestURI().getPath();
            if (path == null || path.equals("/")) {
                path = "/index.html";
            }
            File file = new File(root, path.startsWith("/") ? path.substring(1) : path);
            if (!file.exists() || file.isDirectory()) {
                file = new File(root, "index.html");
            }

            Headers headers = exchange.getResponseHeaders();
            headers.add("Content-Type", contentType(file.getName()));
            byte[] bytes = readBytes(file);
            exchange.sendResponseHeaders(200, bytes.length);
            OutputStream os = exchange.getResponseBody();
            os.write(bytes);
            os.close();
        }

        private byte[] readBytes(File file) throws IOException {
            FileInputStream stream = new FileInputStream(file);
            byte[] bytes = new byte[(int) file.length()];
            int read = stream.read(bytes);
            stream.close();
            if (read < 0) {
                return "Not found".getBytes(StandardCharsets.UTF_8);
            }
            return bytes;
        }

        private String contentType(String name) {
            if (name.endsWith(".html")) return "text/html; charset=utf-8";
            if (name.endsWith(".css")) return "text/css; charset=utf-8";
            if (name.endsWith(".js")) return "application/javascript; charset=utf-8";
            if (name.endsWith(".jsx")) return "text/plain; charset=utf-8";
            if (name.endsWith(".svg")) return "image/svg+xml";
            if (name.endsWith(".json")) return "application/json; charset=utf-8";
            if (name.endsWith(".webmanifest")) return "application/manifest+json; charset=utf-8";
            return "application/octet-stream";
        }
    }
}
