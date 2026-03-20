package com.familyguard.child.network;

import com.familyguard.child.model.ApiMessageResponse;
import com.familyguard.child.model.CommandAckRequest;
import com.familyguard.child.model.CommandListResponse;
import com.familyguard.child.model.EnrollRequest;
import com.familyguard.child.model.EnrollResponse;

import java.util.Map;

import retrofit2.Call;
import retrofit2.http.Body;
import retrofit2.http.GET;
import retrofit2.http.POST;
import retrofit2.http.Path;

public interface FamilyGuardApi {
    @POST("api/device/enroll")
    Call<EnrollResponse> enroll(@Body EnrollRequest request);

    @POST("api/device/location")
    Call<ApiMessageResponse> sendLocation(@Body Map<String, Object> body);

    @POST("api/device/screen-time")
    Call<ApiMessageResponse> sendScreenTime(@Body Map<String, Object> body);

    @POST("api/device/app-usage")
    Call<ApiMessageResponse> sendAppUsage(@Body Map<String, Object> body);

    @POST("api/device/installed-apps")
    Call<ApiMessageResponse> sendInstalledApps(@Body Map<String, Object> body);

    @POST("api/device/contacts")
    Call<ApiMessageResponse> sendContacts(@Body Map<String, Object> body);

    @POST("api/device/sms")
    Call<ApiMessageResponse> sendSms(@Body Map<String, Object> body);

    @POST("api/device/activity")
    Call<ApiMessageResponse> sendActivity(@Body Map<String, Object> body);

    @POST("api/device/notifications")
    Call<ApiMessageResponse> sendNotifications(@Body Map<String, Object> body);

    @GET("api/device/commands")
    Call<CommandListResponse> getCommands();

    @POST("api/device/commands/{commandId}/ack")
    Call<ApiMessageResponse> acknowledgeCommand(@Path("commandId") String commandId, @Body CommandAckRequest body);
}
