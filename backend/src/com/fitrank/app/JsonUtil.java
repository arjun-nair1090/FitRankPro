package com.fitrank.app;

import java.io.UnsupportedEncodingException;
import java.net.URLDecoder;
import java.security.MessageDigest;
import java.util.HashMap;
import java.util.Map;

public final class JsonUtil {
    private JsonUtil() {
    }

    public static String escape(String value) {
        if (value == null) {
            return "";
        }
        return value.replace("\\", "\\\\").replace("\"", "\\\"").replace("\n", "\\n").replace("\r", "");
    }

    public static Map<String, String> parseObject(String json) {
        Map<String, String> map = new HashMap<String, String>();
        if (json == null) {
            return map;
        }
        String body = json.trim();
        if (body.startsWith("{")) {
            body = body.substring(1);
        }
        if (body.endsWith("}")) {
            body = body.substring(0, body.length() - 1);
        }
        String[] parts = body.split(",");
        for (String part : parts) {
            int colon = part.indexOf(':');
            if (colon > -1) {
                String key = clean(part.substring(0, colon));
                String value = clean(part.substring(colon + 1));
                map.put(key, value);
            }
        }
        return map;
    }

    public static Map<String, String> parseQuery(String query) {
        Map<String, String> map = new HashMap<String, String>();
        if (query == null || query.trim().length() == 0) {
            return map;
        }
        String[] pairs = query.split("&");
        for (String pair : pairs) {
            String[] pieces = pair.split("=", 2);
            if (pieces.length == 2) {
                map.put(urlDecode(pieces[0]), urlDecode(pieces[1]));
            }
        }
        return map;
    }

    public static String hash(String value) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] encoded = digest.digest(value.getBytes("UTF-8"));
            StringBuilder hex = new StringBuilder();
            for (byte b : encoded) {
                String h = Integer.toHexString(0xff & b);
                if (h.length() == 1) {
                    hex.append('0');
                }
                hex.append(h);
            }
            return hex.toString();
        } catch (Exception ex) {
            return value;
        }
    }

    private static String clean(String value) {
        String result = value.trim();
        if (result.startsWith("\"")) {
            result = result.substring(1);
        }
        if (result.endsWith("\"")) {
            result = result.substring(0, result.length() - 1);
        }
        return result.replace("\\\"", "\"").replace("\\n", "\n");
    }

    private static String urlDecode(String value) {
        try {
            return URLDecoder.decode(value, "UTF-8");
        } catch (UnsupportedEncodingException ex) {
            return value;
        }
    }
}
