package com.familyguard.child.storage;

import android.content.Context;
import android.content.SharedPreferences;

public class SecurePrefs {
    private static final String PREF_NAME = "familyguard_child_prefs";
    private static final String KEY_API_URL = "api_url";
    private static final String KEY_PARENT_ID = "parent_id";
    private static final String KEY_PAIRING_CODE = "pairing_code";
    private static final String KEY_DEVICE_ID = "device_id";
    private static final String KEY_DEVICE_TOKEN = "device_token";

    private final SharedPreferences preferences;

    public SecurePrefs(Context context) {
        this.preferences = context.getSharedPreferences(PREF_NAME, Context.MODE_PRIVATE);
    }

    public void saveEnrollmentConfig(String apiUrl, String parentId, String pairingCode) {
        preferences.edit()
                .putString(KEY_API_URL, safe(apiUrl))
                .putString(KEY_PARENT_ID, safe(parentId))
                .putString(KEY_PAIRING_CODE, safe(pairingCode))
                .apply();
    }

    public void saveDeviceAuth(String deviceId, String deviceToken) {
        preferences.edit()
                .putString(KEY_DEVICE_ID, safe(deviceId))
                .putString(KEY_DEVICE_TOKEN, safe(deviceToken))
                .apply();
    }

    public void clearDeviceAuth() {
        preferences.edit()
                .remove(KEY_DEVICE_ID)
                .remove(KEY_DEVICE_TOKEN)
                .apply();
    }

    public String getApiUrl() {
        return safe(preferences.getString(KEY_API_URL, ""));
    }

    public String getParentId() {
        return safe(preferences.getString(KEY_PARENT_ID, ""));
    }

    public String getPairingCode() {
        return safe(preferences.getString(KEY_PAIRING_CODE, ""));
    }

    public String getDeviceId() {
        return safe(preferences.getString(KEY_DEVICE_ID, ""));
    }

    public String getDeviceToken() {
        return safe(preferences.getString(KEY_DEVICE_TOKEN, ""));
    }

    public boolean isEnrolled() {
        return !getDeviceId().isEmpty() && !getDeviceToken().isEmpty();
    }

    private String safe(String value) {
        return value == null ? "" : value.trim();
    }
}
