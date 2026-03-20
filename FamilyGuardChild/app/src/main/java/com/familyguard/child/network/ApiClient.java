package com.familyguard.child.network;

import android.content.Context;

import com.familyguard.child.storage.SecurePrefs;

import okhttp3.Interceptor;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.Response;
import okhttp3.logging.HttpLoggingInterceptor;
import retrofit2.Retrofit;
import retrofit2.converter.gson.GsonConverterFactory;

import java.io.IOException;
import java.net.URI;
import java.net.URISyntaxException;
import java.util.concurrent.TimeUnit;

public class ApiClient {
    private static Retrofit retrofit;
    private static String activeBaseUrl;
    private static final int MAX_NETWORK_RETRIES = 2;

    private ApiClient() {}

    public static synchronized FamilyGuardApi getApi(Context context) {
        Context appContext = context.getApplicationContext();
        SecurePrefs prefs = new SecurePrefs(appContext);
        String baseUrl = normalizeBaseUrl(prefs.getApiUrl());
        if (retrofit == null || activeBaseUrl == null || !activeBaseUrl.equals(baseUrl)) {
            activeBaseUrl = baseUrl;
            retrofit = createRetrofit(appContext, baseUrl);
        }
        return retrofit.create(FamilyGuardApi.class);
    }

    private static Retrofit createRetrofit(Context context, String baseUrl) {
        HttpLoggingInterceptor logging = new HttpLoggingInterceptor();
        logging.setLevel(HttpLoggingInterceptor.Level.BASIC);

        Interceptor retryInterceptor = chain -> {
            IOException lastException = null;
            for (int attempt = 0; attempt <= MAX_NETWORK_RETRIES; attempt++) {
                try {
                    return chain.proceed(chain.request());
                } catch (IOException ioException) {
                    lastException = ioException;
                    if (attempt == MAX_NETWORK_RETRIES) {
                        throw ioException;
                    }
                    try {
                        Thread.sleep((long) Math.pow(2, attempt) * 300L);
                    } catch (InterruptedException interruptedException) {
                        Thread.currentThread().interrupt();
                        throw ioException;
                    }
                }
            }
            if (lastException != null) throw lastException;
            throw new IOException("Unknown network failure");
        };

        Interceptor authInterceptor = chain -> {
            Request original = chain.request();
            SecurePrefs prefs = new SecurePrefs(context);
            String token = prefs.getDeviceToken();

            Request.Builder builder = original.newBuilder();
            if (!token.isEmpty()) {
                builder.header("x-device-token", token);
            }
            return chain.proceed(builder.build());
        };

        OkHttpClient client = new OkHttpClient.Builder()
                .addInterceptor(retryInterceptor)
                .addInterceptor(authInterceptor)
                .addInterceptor(logging)
                .retryOnConnectionFailure(true)
                .connectTimeout(20, TimeUnit.SECONDS)
                .readTimeout(40, TimeUnit.SECONDS)
                .writeTimeout(40, TimeUnit.SECONDS)
                .callTimeout(45, TimeUnit.SECONDS)
                .build();

        return new Retrofit.Builder()
                .baseUrl(baseUrl)
                .client(client)
                .addConverterFactory(GsonConverterFactory.create())
                .build();
    }

    public static String normalizeBaseUrl(String rawUrl) {
        String safe = rawUrl == null ? "" : rawUrl.trim();
        if (safe.isEmpty()) {
            throw new IllegalStateException("API base URL is empty. Please enroll with a valid API URL.");
        }
        try {
            URI uri = new URI(safe);
            if (uri.getScheme() == null || uri.getHost() == null) {
                throw new IllegalStateException("API URL is invalid.");
            }
        } catch (URISyntaxException exception) {
            throw new IllegalStateException("API URL is invalid.");
        }
        if (!safe.endsWith("/")) {
            safe = safe + "/";
        }
        return safe;
    }

    public static synchronized void rebuild(Context context) {
        retrofit = null;
        activeBaseUrl = null;
        getApi(context);
    }
}
