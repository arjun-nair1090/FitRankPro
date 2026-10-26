package com.fitrank.app;

import java.time.Instant;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** Small, strict JSON reader/writer. Objects become LinkedHashMaps, arrays ArrayLists, numbers Doubles. */
public final class Json {
    private final String s;
    private int i;

    private Json(String s) {
        this.s = s;
    }

    public static Object parse(String text) {
        Json p = new Json(text == null ? "" : text);
        p.ws();
        Object v = p.value();
        p.ws();
        if (p.i != p.s.length()) throw p.error("Unexpected trailing characters");
        return v;
    }

    @SuppressWarnings("unchecked")
    public static Map<String, Object> object(String text) {
        Object v = text == null || text.trim().isEmpty() ? new LinkedHashMap<String, Object>() : parse(text);
        if (!(v instanceof Map)) throw new IllegalArgumentException("Expected a JSON object");
        return (Map<String, Object>) v;
    }

    // ---- typed accessors used by entities when reading request bodies ----

    public static String str(Map<String, Object> m, String key, String fallback) {
        Object v = m.get(key);
        String s = v == null ? "" : String.valueOf(v).trim();
        return s.isEmpty() ? fallback : s;
    }

    public static double num(Map<String, Object> m, String key, double fallback) {
        Object v = m.get(key);
        if (v instanceof Number) return ((Number) v).doubleValue();
        try {
            return v == null ? fallback : Double.parseDouble(String.valueOf(v));
        } catch (NumberFormatException e) {
            throw new IllegalArgumentException("'" + key + "' must be a number");
        }
    }

    /** ISO-8601 instant, or now when missing. */
    public static String time(Map<String, Object> m, String key) {
        String v = str(m, key, null);
        if (v == null) return Instant.now().toString();
        try {
            return Instant.parse(v).toString();
        } catch (DateTimeParseException e) {
            throw new IllegalArgumentException("'" + key + "' must be an ISO date-time");
        }
    }

    @SuppressWarnings("unchecked")
    public static List<Object> list(Map<String, Object> m, String key) {
        Object v = m.get(key);
        return v instanceof List ? (List<Object>) v : new ArrayList<Object>();
    }

    // ---- writer ----

    public static String write(Object v) {
        StringBuilder b = new StringBuilder();
        write(v, b);
        return b.toString();
    }

    private static void write(Object v, StringBuilder b) {
        if (v == null) {
            b.append("null");
        } else if (v instanceof String) {
            quote((String) v, b);
        } else if (v instanceof Double || v instanceof Float) {
            double d = ((Number) v).doubleValue();
            if (Double.isNaN(d) || Double.isInfinite(d)) b.append("null");
            else if (d == Math.rint(d) && Math.abs(d) < 1e15) b.append((long) d);
            else b.append(d);
        } else if (v instanceof Number || v instanceof Boolean) {
            b.append(v);
        } else if (v instanceof BaseEntity) {
            write(((BaseEntity) v).toMap(), b);
        } else if (v instanceof Map) {
            b.append('{');
            boolean first = true;
            for (Map.Entry<?, ?> e : ((Map<?, ?>) v).entrySet()) {
                if (!first) b.append(',');
                first = false;
                quote(String.valueOf(e.getKey()), b);
                b.append(':');
                write(e.getValue(), b);
            }
            b.append('}');
        } else if (v instanceof Collection) {
            b.append('[');
            boolean first = true;
            for (Object o : (Collection<?>) v) {
                if (!first) b.append(',');
                first = false;
                write(o, b);
            }
            b.append(']');
        } else {
            quote(v.toString(), b);
        }
    }

    private static void quote(String s, StringBuilder b) {
        b.append('"');
        for (int k = 0; k < s.length(); k++) {
            char c = s.charAt(k);
            if (c == '"' || c == '\\') b.append('\\').append(c);
            else if (c == '\n') b.append("\\n");
            else if (c == '\r') b.append("\\r");
            else if (c == '\t') b.append("\\t");
            else if (c < 0x20 || c == '<') b.append(String.format("\\u%04x", (int) c));
            else b.append(c);
        }
        b.append('"');
    }

    // ---- reader ----

    private Object value() {
        if (i >= s.length()) throw error("Unexpected end of input");
        char c = s.charAt(i);
        if (c == '{') return object();
        if (c == '[') return array();
        if (c == '"') return string();
        if (s.startsWith("true", i)) { i += 4; return Boolean.TRUE; }
        if (s.startsWith("false", i)) { i += 5; return Boolean.FALSE; }
        if (s.startsWith("null", i)) { i += 4; return null; }
        int start = i;
        while (i < s.length() && "+-0123456789.eE".indexOf(s.charAt(i)) >= 0) i++;
        if (start == i) throw error("Unexpected character '" + c + "'");
        try {
            return Double.valueOf(s.substring(start, i));
        } catch (NumberFormatException e) {
            throw error("Invalid number");
        }
    }

    private Map<String, Object> object() {
        Map<String, Object> m = new LinkedHashMap<String, Object>();
        i++;
        ws();
        if (at('}')) { i++; return m; }
        while (true) {
            ws();
            if (!at('"')) throw error("Expected a key");
            String key = string();
            ws();
            expect(':');
            ws();
            m.put(key, value());
            ws();
            if (at(',')) { i++; continue; }
            expect('}');
            return m;
        }
    }

    private List<Object> array() {
        List<Object> list = new ArrayList<Object>();
        i++;
        ws();
        if (at(']')) { i++; return list; }
        while (true) {
            ws();
            list.add(value());
            ws();
            if (at(',')) { i++; continue; }
            expect(']');
            return list;
        }
    }

    private String string() {
        StringBuilder b = new StringBuilder();
        i++;
        while (i < s.length()) {
            char c = s.charAt(i++);
            if (c == '"') return b.toString();
            if (c != '\\') { b.append(c); continue; }
            if (i >= s.length()) break;
            char e = s.charAt(i++);
            switch (e) {
                case 'n': b.append('\n'); break;
                case 't': b.append('\t'); break;
                case 'r': b.append('\r'); break;
                case 'b': b.append('\b'); break;
                case 'f': b.append('\f'); break;
                case 'u':
                    if (i + 4 > s.length()) throw error("Invalid unicode escape");
                    b.append((char) Integer.parseInt(s.substring(i, i + 4), 16));
                    i += 4;
                    break;
                default: b.append(e);
            }
        }
        throw error("Unterminated string");
    }

    private void ws() {
        while (i < s.length() && Character.isWhitespace(s.charAt(i))) i++;
    }

    private boolean at(char c) {
        return i < s.length() && s.charAt(i) == c;
    }

    private void expect(char c) {
        if (!at(c)) throw error("Expected '" + c + "'");
        i++;
    }

    private IllegalArgumentException error(String message) {
        return new IllegalArgumentException("Invalid JSON at " + i + ": " + message);
    }
}
