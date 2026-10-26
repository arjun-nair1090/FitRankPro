package com.fitrank.app;

import javax.crypto.Mac;
import javax.crypto.SecretKeyFactory;
import javax.crypto.spec.PBEKeySpec;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.Base64;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/** Password hashing (PBKDF2), signed session tokens (HMAC) and one-time reset codes. */
public final class Auth {
    private static final SecureRandom RANDOM = new SecureRandom();
    private static final int ITERATIONS = 120000;
    private static final long SESSION_SECONDS = 30L * 24 * 3600;
    private static final long RESET_MILLIS = 30L * 60 * 1000;

    private final byte[] secret;
    // ponytail: reset codes live in memory, so a restart invalidates pending resets; persist them if that ever matters.
    private final Map<String, String[]> resets = new ConcurrentHashMap<String, String[]>();

    public Auth(String secret) {
        this.secret = secret == null || secret.isEmpty() ? randomBytes(32) : secret.getBytes(StandardCharsets.UTF_8);
    }

    // ---- passwords ----

    public static String hash(String password) {
        byte[] salt = randomBytes(16);
        return "pbkdf2$" + ITERATIONS + "$" + b64(salt) + "$" + b64(pbkdf2(password, salt, ITERATIONS));
    }

    public static boolean verify(String password, String stored) {
        String[] p = stored == null ? new String[0] : stored.split("\\$");
        if (p.length != 4 || !"pbkdf2".equals(p[0])) return false;
        Base64.Decoder d = Base64.getUrlDecoder();
        return MessageDigest.isEqual(d.decode(p[3]), pbkdf2(password, d.decode(p[2]), Integer.parseInt(p[1])));
    }

    public static void checkStrength(String password) {
        if (password == null || password.length() < 8) throw new IllegalArgumentException("Password must be at least 8 characters");
    }

    private static byte[] pbkdf2(String password, byte[] salt, int iterations) {
        try {
            PBEKeySpec spec = new PBEKeySpec(password.toCharArray(), salt, iterations, 256);
            return SecretKeyFactory.getInstance("PBKDF2WithHmacSHA256").generateSecret(spec).getEncoded();
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }

    // ---- session tokens: "<userId>.<expiresEpochSeconds>.<hmac>" ----

    public String issue(int userId) {
        String payload = userId + "." + (System.currentTimeMillis() / 1000 + SESSION_SECONDS);
        return payload + "." + sign(payload);
    }

    /** Returns the user id for a valid, unexpired token, or -1. */
    public int verifyToken(String token) {
        if (token == null) return -1;
        String[] p = token.split("\\.");
        if (p.length != 3) return -1;
        String payload = p[0] + "." + p[1];
        if (!MessageDigest.isEqual(sign(payload).getBytes(StandardCharsets.UTF_8), p[2].getBytes(StandardCharsets.UTF_8))) return -1;
        try {
            return Long.parseLong(p[1]) * 1000 > System.currentTimeMillis() ? Integer.parseInt(p[0]) : -1;
        } catch (NumberFormatException e) {
            return -1;
        }
    }

    private String sign(String payload) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secret, "HmacSHA256"));
            return b64(mac.doFinal(payload.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }

    // ---- password reset codes ----

    public String startReset(String email) {
        String code = String.format("%06d", RANDOM.nextInt(1000000));
        resets.put(email, new String[] {code, String.valueOf(System.currentTimeMillis() + RESET_MILLIS)});
        return code;
    }

    /** Consumes the code when it matches; a wrong guess also burns it so codes can't be brute-forced. */
    public boolean finishReset(String email, String code) {
        String[] r = resets.remove(email);
        return r != null && Long.parseLong(r[1]) > System.currentTimeMillis()
                && MessageDigest.isEqual(r[0].getBytes(StandardCharsets.UTF_8), String.valueOf(code).getBytes(StandardCharsets.UTF_8));
    }

    public static String randomPassword() {
        return b64(randomBytes(12));
    }

    private static byte[] randomBytes(int n) {
        byte[] b = new byte[n];
        RANDOM.nextBytes(b);
        return b;
    }

    private static String b64(byte[] bytes) {
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }
}
