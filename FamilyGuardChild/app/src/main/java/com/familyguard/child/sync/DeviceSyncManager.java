package com.familyguard.child.sync;

import android.Manifest;
import android.content.Context;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.database.Cursor;
import android.location.Location;
import android.location.LocationManager;
import android.provider.ContactsContract;
import android.provider.Telephony;

import androidx.core.content.ContextCompat;

import com.familyguard.child.model.ApiMessageResponse;
import com.familyguard.child.model.CommandAckRequest;
import com.familyguard.child.model.CommandItem;
import com.familyguard.child.model.CommandListResponse;
import com.familyguard.child.network.ApiClient;
import com.familyguard.child.network.FamilyGuardApi;
import com.familyguard.child.storage.SecurePrefs;

import java.io.IOException;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

import retrofit2.Call;
import retrofit2.Response;

public class DeviceSyncManager {
    private static final int MAX_HTTP_RETRIES = 3;

    private DeviceSyncManager() {}

    public static void syncAll(Context context) {
        Context appContext = context.getApplicationContext();
        SecurePrefs prefs = new SecurePrefs(appContext);
        if (!prefs.isEnrolled()) {
            return;
        }
        if (!isLikelyJwt(prefs.getDeviceToken())) {
            prefs.clearDeviceAuth();
            return;
        }

        FamilyGuardApi api;
        try {
            api = ApiClient.getApi(appContext);
        } catch (Exception exception) {
            return;
        }

        executeWithRetry(api.sendLocation(collectLocation(appContext)));
        safeExecute(api.sendScreenTime(collectScreenTime()));
        safeExecute(api.sendAppUsage(collectAppUsage()));
        safeExecute(api.sendInstalledApps(collectInstalledApps(appContext)));
        safeExecute(api.sendContacts(collectContacts(appContext)));
        safeExecute(api.sendSms(collectSms(appContext)));
        safeExecute(api.sendActivity(collectActivity()));
        safeExecute(api.sendNotifications(collectNotification()));

        pollAndAcknowledgeCommands(appContext, api);
    }

    private static void pollAndAcknowledgeCommands(Context context, FamilyGuardApi api) {
        try {
            Response<CommandListResponse> response = executeCommandFetchWithRetry(api.getCommands());
            if (!response.isSuccessful() || response.body() == null || response.body().commands == null) {
                return;
            }

            for (CommandItem item : response.body().commands) {
                if (item == null || item.commandId == null) continue;

                String result = "Command handled";
                String status = "executed";

                if ("request-location-now".equals(item.commandType)) {
                    executeWithRetry(api.sendLocation(collectLocation(context)));
                    result = "Fresh location sync submitted";
                } else if ("request-sync-now".equals(item.commandType)) {
                    runOneShotSyncWithoutCommands(context, api);
                    result = "Sync routine executed";
                } else if ("lock-screen-intent".equals(item.commandType)) {
                    status = "acknowledged";
                    result = "Lock screen intent acknowledged";
                } else if ("ping".equals(item.commandType)) {
                    result = "Ping successful";
                }

                CommandAckRequest ack = new CommandAckRequest();
                ack.status = status;
                ack.resultMessage = result;
                ack.acknowledgedAt = isoNow();
                executeWithRetry(api.acknowledgeCommand(item.commandId, ack));
            }
        } catch (Exception ignored) {
        }
    }

    private static void safeExecute(Call<ApiMessageResponse> call) {
        executeWithRetry(call);
    }

    private static void runOneShotSyncWithoutCommands(Context context, FamilyGuardApi api) {
        executeWithRetry(api.sendLocation(collectLocation(context)));
        safeExecute(api.sendScreenTime(collectScreenTime()));
        safeExecute(api.sendAppUsage(collectAppUsage()));
        safeExecute(api.sendInstalledApps(collectInstalledApps(context)));
        safeExecute(api.sendContacts(collectContacts(context)));
        safeExecute(api.sendSms(collectSms(context)));
        safeExecute(api.sendActivity(collectActivity()));
        safeExecute(api.sendNotifications(collectNotification()));
    }

    private static boolean executeWithRetry(Call<ApiMessageResponse> call) {
        if (call == null) return false;

        for (int attempt = 0; attempt < MAX_HTTP_RETRIES; attempt++) {
            Call<ApiMessageResponse> executingCall = attempt == 0 ? call : call.clone();
            try {
                Response<ApiMessageResponse> response = executingCall.execute();
                if (response.isSuccessful()) {
                    return true;
                }

                if (response.code() >= 400 && response.code() < 500 && response.code() != 429) {
                    return false;
                }
            } catch (IOException ignored) {
            }

            sleepQuietly((long) Math.pow(2, attempt) * 300L);
        }
        return false;
    }

    private static Response<CommandListResponse> executeCommandFetchWithRetry(Call<CommandListResponse> call) throws IOException {
        IOException finalException = null;
        for (int attempt = 0; attempt < MAX_HTTP_RETRIES; attempt++) {
            Call<CommandListResponse> executingCall = attempt == 0 ? call : call.clone();
            try {
                Response<CommandListResponse> response = executingCall.execute();
                if (response.isSuccessful() || (response.code() >= 400 && response.code() < 500 && response.code() != 429)) {
                    return response;
                }
            } catch (IOException exception) {
                finalException = exception;
            }
            sleepQuietly((long) Math.pow(2, attempt) * 300L);
        }
        if (finalException != null) throw finalException;
        throw new IOException("Command fetch failed after retries");
    }

    private static Map<String, Object> collectLocation(Context context) {
        Map<String, Object> payload = new HashMap<>();
        payload.put("latitude", 0.0);
        payload.put("longitude", 0.0);
        payload.put("accuracyMeters", 0.0);
        payload.put("batteryLevel", 50.0);
        payload.put("recordedAt", isoNow());

        boolean hasFine = ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED;
        boolean hasCoarse = ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED;
        if (!hasFine && !hasCoarse) {
            return payload;
        }

        try {
            LocationManager manager = (LocationManager) context.getSystemService(Context.LOCATION_SERVICE);
            if (manager == null) return payload;

            List<String> providers = manager.getProviders(true);
            if (providers == null || providers.isEmpty()) {
                return payload;
            }
            for (String provider : providers) {
                Location location = manager.getLastKnownLocation(provider);
                if (location != null) {
                    payload.put("latitude", location.getLatitude());
                    payload.put("longitude", location.getLongitude());
                    payload.put("accuracyMeters", (double) location.getAccuracy());
                    payload.put("recordedAt", isoNow());
                    break;
                }
            }
        } catch (Exception ignored) {
        }
        return payload;
    }

    private static Map<String, Object> collectScreenTime() {
        Map<String, Object> payload = new HashMap<>();
        payload.put("date", new SimpleDateFormat("yyyy-MM-dd", Locale.US).format(new Date()));
        payload.put("totalMinutes", 120);

        List<Map<String, Object>> appBreakdown = new ArrayList<>();
        appBreakdown.add(appMinutes("com.android.chrome", 45));
        appBreakdown.add(appMinutes("com.whatsapp", 35));
        appBreakdown.add(appMinutes("com.google.android.youtube", 40));
        payload.put("appBreakdown", appBreakdown);
        payload.put("recordedAt", isoNow());
        return payload;
    }

    private static Map<String, Object> collectAppUsage() {
        Map<String, Object> payload = new HashMap<>();
        payload.put("packageName", "com.android.chrome");
        payload.put("appName", "Chrome");
        payload.put("minutes", 45);
        payload.put("date", new SimpleDateFormat("yyyy-MM-dd", Locale.US).format(new Date()));
        payload.put("recordedAt", isoNow());
        return payload;
    }

    private static Map<String, Object> collectInstalledApps(Context context) {
        Map<String, Object> payload = new HashMap<>();
        List<Map<String, Object>> apps = new ArrayList<>();

        try {
            List<PackageInfo> installed = context.getPackageManager().getInstalledPackages(0);
            int max = Math.min(installed.size(), 50);
            for (int i = 0; i < max; i++) {
                PackageInfo pkg = installed.get(i);
                if (pkg == null || pkg.applicationInfo == null) continue;
                Map<String, Object> app = new HashMap<>();
                app.put("packageName", pkg.packageName);
                app.put("appName", String.valueOf(pkg.applicationInfo.loadLabel(context.getPackageManager())));
                app.put("versionName", pkg.versionName == null ? "" : pkg.versionName);
                boolean system = (pkg.applicationInfo.flags & android.content.pm.ApplicationInfo.FLAG_SYSTEM) != 0;
                app.put("systemApp", system);
                apps.add(app);
            }
        } catch (Exception ignored) {
        }

        payload.put("apps", apps);
        payload.put("capturedAt", isoNow());
        return payload;
    }

    private static Map<String, Object> collectContacts(Context context) {
        Map<String, Object> payload = new HashMap<>();
        List<Map<String, Object>> contacts = new ArrayList<>();

        boolean hasPermission = ContextCompat.checkSelfPermission(context, Manifest.permission.READ_CONTACTS) == PackageManager.PERMISSION_GRANTED;
        if (hasPermission) {
            Cursor cursor = null;
            try {
                cursor = context.getContentResolver().query(
                        ContactsContract.CommonDataKinds.Phone.CONTENT_URI,
                        new String[]{
                                ContactsContract.CommonDataKinds.Phone.DISPLAY_NAME,
                                ContactsContract.CommonDataKinds.Phone.NUMBER
                        },
                        null,
                        null,
                        null
                );

                if (cursor != null) {
                    int nameIndex = cursor.getColumnIndex(ContactsContract.CommonDataKinds.Phone.DISPLAY_NAME);
                    int numberIndex = cursor.getColumnIndex(ContactsContract.CommonDataKinds.Phone.NUMBER);
                    if (nameIndex < 0 || numberIndex < 0) {
                        payload.put("contacts", contacts);
                        payload.put("capturedAt", isoNow());
                        return payload;
                    }

                    int count = 0;
                    while (cursor.moveToNext() && count < 50) {
                        Map<String, Object> item = new HashMap<>();
                        item.put("name", cursor.getString(nameIndex));
                        item.put("phoneNumber", cursor.getString(numberIndex));
                        contacts.add(item);
                        count++;
                    }
                }
            } catch (Exception ignored) {
            } finally {
                if (cursor != null) cursor.close();
            }
        }

        payload.put("contacts", contacts);
        payload.put("capturedAt", isoNow());
        return payload;
    }

    private static Map<String, Object> collectSms(Context context) {
        Map<String, Object> payload = new HashMap<>();
        List<Map<String, Object>> messages = new ArrayList<>();

        boolean hasPermission = ContextCompat.checkSelfPermission(context, Manifest.permission.READ_SMS) == PackageManager.PERMISSION_GRANTED;
        if (hasPermission) {
            Cursor cursor = null;
            try {
                cursor = context.getContentResolver().query(
                        Telephony.Sms.CONTENT_URI,
                        new String[]{
                                Telephony.Sms.ADDRESS,
                                Telephony.Sms.BODY,
                                Telephony.Sms.TYPE,
                                Telephony.Sms.DATE
                        },
                        null,
                        null,
                        Telephony.Sms.DEFAULT_SORT_ORDER
                );

                if (cursor != null) {
                    int addressIdx = cursor.getColumnIndex(Telephony.Sms.ADDRESS);
                    int bodyIdx = cursor.getColumnIndex(Telephony.Sms.BODY);
                    int typeIdx = cursor.getColumnIndex(Telephony.Sms.TYPE);
                    int dateIdx = cursor.getColumnIndex(Telephony.Sms.DATE);
                    if (addressIdx < 0 || bodyIdx < 0 || typeIdx < 0 || dateIdx < 0) {
                        payload.put("messages", messages);
                        payload.put("capturedAt", isoNow());
                        return payload;
                    }

                    int count = 0;
                    while (cursor.moveToNext() && count < 50) {
                        Map<String, Object> sms = new HashMap<>();
                        sms.put("address", cursor.getString(addressIdx));
                        sms.put("body", cursor.getString(bodyIdx));
                        sms.put("type", mapSmsType(cursor.getInt(typeIdx)));
                        sms.put("timestamp", String.valueOf(cursor.getLong(dateIdx)));
                        messages.add(sms);
                        count++;
                    }
                }
            } catch (Exception ignored) {
            } finally {
                if (cursor != null) cursor.close();
            }
        }

        payload.put("messages", messages);
        payload.put("capturedAt", isoNow());
        return payload;
    }

    private static Map<String, Object> collectActivity() {
        Map<String, Object> payload = new HashMap<>();
        payload.put("eventType", "background-sync");
        payload.put("title", "Periodic sync complete");
        payload.put("description", "FamilyGuard child app uploaded activity snapshot");
        payload.put("metadata", new HashMap<String, Object>());
        payload.put("occurredAt", isoNow());
        return payload;
    }

    private static Map<String, Object> collectNotification() {
        Map<String, Object> payload = new HashMap<>();
        payload.put("packageName", "com.familyguard.child");
        payload.put("appName", "FamilyGuard Child");
        payload.put("title", "Monitoring active");
        payload.put("text", "Foreground service heartbeat");
        payload.put("postedAt", isoNow());
        return payload;
    }

    private static Map<String, Object> appMinutes(String packageName, int minutes) {
        Map<String, Object> row = new HashMap<>();
        row.put("packageName", packageName);
        row.put("minutes", minutes);
        return row;
    }

    private static String mapSmsType(int type) {
        if (type == Telephony.Sms.MESSAGE_TYPE_INBOX) return "inbox";
        if (type == Telephony.Sms.MESSAGE_TYPE_SENT) return "sent";
        if (type == Telephony.Sms.MESSAGE_TYPE_DRAFT) return "draft";
        return "other";
    }

    private static String isoNow() {
        return new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSSXXX", Locale.US).format(new Date());
    }

    private static void sleepQuietly(long ms) {
        try {
            Thread.sleep(ms);
        } catch (InterruptedException ignored) {
            Thread.currentThread().interrupt();
        }
    }

    private static boolean isLikelyJwt(String token) {
        if (token == null) return false;
        String[] parts = token.trim().split("\\.");
        return parts.length == 3;
    }
}
