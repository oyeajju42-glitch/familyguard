package com.familyguard.child.service;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.Service;
import android.content.Intent;
import android.os.Build;
import android.os.IBinder;

import androidx.annotation.Nullable;
import androidx.core.app.NotificationCompat;

import com.familyguard.child.R;
import com.familyguard.child.sync.DeviceSyncManager;
import com.familyguard.child.worker.PeriodicSyncWorker;

import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicBoolean;

public class MonitoringForegroundService extends Service {
    private static final String CHANNEL_ID = "familyguard_monitoring_channel";
    private static final int NOTIFICATION_ID = 2110;
    private final ExecutorService executorService = Executors.newSingleThreadExecutor();
    private final AtomicBoolean syncRunning = new AtomicBoolean(false);

    @Override
    public void onCreate() {
        super.onCreate();
        createNotificationChannel();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        try {
            Notification notification = buildNotification();
            startForeground(NOTIFICATION_ID, notification);

            PeriodicSyncWorker.schedule(getApplicationContext());
            if (syncRunning.compareAndSet(false, true)) {
                executorService.execute(() -> {
                    try {
                        DeviceSyncManager.syncAll(getApplicationContext());
                    } catch (Exception ignored) {
                    } finally {
                        syncRunning.set(false);
                    }
                });
            }
            return START_REDELIVER_INTENT;
        } catch (Exception exception) {
            stopSelf();
            return START_NOT_STICKY;
        }
    }

    @Override
    public void onDestroy() {
        executorService.shutdownNow();
        super.onDestroy();
    }

    @Override
    public void onTaskRemoved(Intent rootIntent) {
        PeriodicSyncWorker.schedule(getApplicationContext());
        super.onTaskRemoved(rootIntent);
    }

    @Nullable
    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    private Notification buildNotification() {
        return new NotificationCompat.Builder(this, CHANNEL_ID)
                .setContentTitle(getString(R.string.sync_notification_title))
                .setContentText(getString(R.string.sync_notification_body))
                .setSmallIcon(android.R.drawable.ic_menu_mylocation)
                .setOngoing(true)
                .setPriority(NotificationCompat.PRIORITY_LOW)
                .setOnlyAlertOnce(true)
                .build();
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
            return;
        }

        NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                getString(R.string.sync_channel_name),
                NotificationManager.IMPORTANCE_LOW
        );
        channel.setDescription(getString(R.string.sync_channel_desc));

        NotificationManager manager = getSystemService(NotificationManager.class);
        if (manager != null) {
            manager.createNotificationChannel(channel);
        }
    }
}
