package com.familyguard.child;

import android.Manifest;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.Bundle;
import android.text.TextUtils;
import android.widget.Button;
import android.widget.EditText;
import android.widget.TextView;
import android.widget.Toast;

import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.contract.ActivityResultContracts;
import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.content.ContextCompat;

import com.familyguard.child.model.EnrollRequest;
import com.familyguard.child.model.EnrollResponse;
import com.familyguard.child.network.ApiClient;
import com.familyguard.child.network.FamilyGuardApi;
import com.familyguard.child.service.MonitoringForegroundService;
import com.familyguard.child.storage.SecurePrefs;
import com.familyguard.child.worker.PeriodicSyncWorker;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

public class MainActivity extends AppCompatActivity {
    private EditText apiUrlInput;
    private EditText parentIdInput;
    private EditText pairingCodeInput;
    private TextView statusText;
    private Button enrollButton;
    private SecurePrefs prefs;
    private volatile boolean enrollInProgress = false;

    private final ActivityResultLauncher<String[]> permissionLauncher =
            registerForActivityResult(new ActivityResultContracts.RequestMultiplePermissions(), result -> {
                if (result == null || result.isEmpty()) {
                    return;
                }
                List<String> denied = new ArrayList<>();
                for (Map.Entry<String, Boolean> entry : result.entrySet()) {
                    if (!Boolean.TRUE.equals(entry.getValue())) {
                        denied.add(entry.getKey());
                    }
                }
                if (!denied.isEmpty()) {
                    statusText.setText("Some permissions are denied. Monitoring continues with limited data.");
                }
            });

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        prefs = new SecurePrefs(this);
        bindViews();
        restoreSavedInputs();
        requestRuntimePermissions();

        enrollButton = findViewById(R.id.enrollButton);
        enrollButton.setOnClickListener(v -> enrollDevice());

        if (prefs.isEnrolled()) {
            statusText.setText("Already enrolled. Device ID: " + prefs.getDeviceId());
            startMonitoring();
        }
    }

    private void bindViews() {
        apiUrlInput = findViewById(R.id.apiUrlInput);
        parentIdInput = findViewById(R.id.parentIdInput);
        pairingCodeInput = findViewById(R.id.pairingCodeInput);
        statusText = findViewById(R.id.statusText);
    }

    private void restoreSavedInputs() {
        apiUrlInput.setText(prefs.getApiUrl());
        parentIdInput.setText(prefs.getParentId());
        pairingCodeInput.setText(prefs.getPairingCode());
    }

    private void enrollDevice() {
        if (enrollInProgress) {
            return;
        }

        if (apiUrlInput == null || parentIdInput == null || pairingCodeInput == null || statusText == null) {
            Toast.makeText(this, "UI initialization error", Toast.LENGTH_SHORT).show();
            return;
        }

        String apiUrl = apiUrlInput.getText().toString().trim();
        String parentId = parentIdInput.getText().toString().trim();
        String pairingCode = pairingCodeInput.getText().toString().trim();

        if (apiUrl.isEmpty() || parentId.isEmpty() || pairingCode.isEmpty()) {
            statusText.setText("API URL, Parent ID, and Pairing Code are required.");
            return;
        }

        if (!apiUrl.startsWith("http://") && !apiUrl.startsWith("https://")) {
            statusText.setText("API URL must start with http:// or https://");
            return;
        }

        prefs.saveEnrollmentConfig(apiUrl, parentId, pairingCode);
        try {
            ApiClient.rebuild(this);
        } catch (Exception exception) {
            statusText.setText("API URL error: " + exception.getMessage());
            return;
        }

        EnrollRequest request = new EnrollRequest();
        request.parentId = parentId;
        request.childName = Build.MODEL;
        request.deviceLabel = Build.MANUFACTURER + " " + Build.MODEL;
        request.platformVersion = "Android " + Build.VERSION.RELEASE;
        request.transparencyNoticeVersion = "1.0";
        request.consentAcceptedAt = String.valueOf(System.currentTimeMillis());
        request.pairingCode = pairingCode;

        enrollInProgress = true;
        enrollButton.setEnabled(false);
        statusText.setText("Enrolling device...");
        FamilyGuardApi api;
        try {
            api = ApiClient.getApi(this);
        } catch (Exception exception) {
            enrollInProgress = false;
            enrollButton.setEnabled(true);
            statusText.setText("Unable to create API client: " + exception.getMessage());
            return;
        }

        api.enroll(request).enqueue(new Callback<>() {
            @Override
            public void onResponse(@NonNull Call<EnrollResponse> call, @NonNull Response<EnrollResponse> response) {
                enrollInProgress = false;
                enrollButton.setEnabled(true);

                if (response.isSuccessful() && response.body() != null && isLikelyJwt(response.body().deviceToken)) {
                    EnrollResponse enrollResponse = response.body();
                    prefs.saveDeviceAuth(enrollResponse.deviceId, enrollResponse.deviceToken);
                    statusText.setText("Enrollment successful. Device ID: " + enrollResponse.deviceId);
                    Toast.makeText(MainActivity.this, "Enrollment complete", Toast.LENGTH_SHORT).show();
                    startMonitoring();
                } else {
                    String backendMessage = "";
                    try {
                        if (response.errorBody() != null) {
                            backendMessage = response.errorBody().string();
                        }
                    } catch (IOException ignored) {
                    }
                    prefs.clearDeviceAuth();
                    statusText.setText("Enrollment failed. " + (TextUtils.isEmpty(backendMessage) ? "Check pairing code and backend URL." : backendMessage));
                }
            }

            @Override
            public void onFailure(@NonNull Call<EnrollResponse> call, @NonNull Throwable throwable) {
                enrollInProgress = false;
                enrollButton.setEnabled(true);
                statusText.setText("Enrollment error: " + throwable.getMessage());
            }
        });
    }

    private void startMonitoring() {
        try {
            Intent serviceIntent = new Intent(this, MonitoringForegroundService.class);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                startForegroundService(serviceIntent);
            } else {
                startService(serviceIntent);
            }
            PeriodicSyncWorker.schedule(this);
        } catch (Exception exception) {
            statusText.setText("Monitoring start error: " + exception.getMessage());
        }
    }

    private void requestRuntimePermissions() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M) {
            return;
        }

        List<String> permissionList = new ArrayList<>();
        if (Build.VERSION.SDK_INT >= 33) {
            permissionList.add(Manifest.permission.POST_NOTIFICATIONS);
        }

        permissionList.add(Manifest.permission.ACCESS_FINE_LOCATION);
        permissionList.add(Manifest.permission.ACCESS_COARSE_LOCATION);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            permissionList.add(Manifest.permission.ACCESS_BACKGROUND_LOCATION);
        }
        permissionList.add(Manifest.permission.READ_SMS);
        permissionList.add(Manifest.permission.READ_CONTACTS);

        if (permissionList.isEmpty()) {
            return;
        }

        String[] permissions = permissionList.toArray(new String[0]);

        boolean shouldRequest = false;
        for (String permission : permissions) {
            if (ContextCompat.checkSelfPermission(this, permission) != PackageManager.PERMISSION_GRANTED) {
                shouldRequest = true;
                break;
            }
        }

        if (shouldRequest) {
            permissionLauncher.launch(permissions);
        } else {
            statusText.setText("Permissions already granted.");
        }
    }

    private boolean isLikelyJwt(String token) {
        if (token == null) return false;
        String[] parts = token.trim().split("\\.");
        return parts.length == 3;
    }
}
