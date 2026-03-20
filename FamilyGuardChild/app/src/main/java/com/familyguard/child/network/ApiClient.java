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
    
    // आपका Live Render URL यहाँ सेट कर दिया गया है
    private static final String PRODUCTION_URL = "https://familyguard-fhnd.onrender.com";

    private ApiClient() {}

    public static synchronized FamilyGuardApi getApi(Context context) {
        Context appContext = context.getApplicationContext();
        
        // अब यह सीधे प्रोडक्शन URL का उपयोग करेगा
        String baseUrl = normalizeBaseUrl(PRODUCTION_URL);
        
        if (retrofit == null || activeBaseUrl == null || !activeBaseUrl.equals(baseUrl)) {
            activeBaseUrl = baseUrl;
            retrofit = createRetrofit(appContext, baseUrl);
        }
        return retrofit.create(FamilyGuardApi.class);
    }

    private static Retrofit createRetrofit(Context context, String baseUrl) {
        HttpLoggingInterceptor logging = new HttpLoggingInterceptor();
        logging.setLevel(HttpLoggingInterceptor.Level.BODY); // ज़्यादा जानकारी के लिए लेवल BODY रखा है

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
            if (token != null && !token.isEmpty()) {
                builder.header("x-device-token", token);
            }
            return chain.proceed(builder.build());
        };

        OkHttpClient client = new OkHttpClient.Builder()
                .addInterceptor(retryInterceptor)
                .addInterceptor(authInterceptor)
                .addInterceptor(logging)
                .retryOnConnectionFailure(true)
                .connectTimeout(30, TimeUnit.SECONDS) // थोड़ा टाइम बढ़ा दिया है Render के लिए
                .readTimeout(40, TimeUnit.SECONDS)
                .writeTimeout(40, TimeUnit.SECONDS)
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
            return PRODUCTION_URL; // अगर खाली है तो डिफ़ॉल्ट URL इस्तेमाल करें
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
