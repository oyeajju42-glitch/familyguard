package com.familyguard.child.service;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

import com.familyguard.child.storage.SecurePrefs;
import com.familyguard.child.worker.PeriodicSyncWorker;

public class BootCompletedReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        if (intent == null || intent.getAction() == null) {
            return;
        }

        String action = intent.getAction();
        if (Intent.ACTION_BOOT_COMPLETED.equals(action) || Intent.ACTION_MY_PACKAGE_REPLACED.equals(action)) {
            SecurePrefs prefs = new SecurePrefs(context.getApplicationContext());
            if (prefs.isEnrolled()) {
                PeriodicSyncWorker.schedule(context.getApplicationContext());
            }
        }
    }
}
