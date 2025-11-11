// ============= API SERVICE =============
package com.condoconnectai.services;

import android.content.Context;
import com.android.volley.Request;
import com.android.volley.RequestQueue;
import com.android.volley.Response;
import com.android.volley.VolleyError;
import com.android.volley.toolbox.JsonObjectRequest;
import com.android.volley.toolbox.JsonArrayRequest;
import com.android.volley.toolbox.Volley;
import com.condoconnectai.models.*;
import com.condoconnectai.utils.AuthManager;
import org.json.JSONObject;
import org.json.JSONArray;
import org.json.JSONException;
import java.util.List;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.Map;

public class ApiService {
    private static ApiService instance;
    private RequestQueue requestQueue;
    private Context context;
    private AuthManager authManager;
    
    private static final String BASE_URL = "https://api.condoconnectai.com/v1";
    
    private ApiService(Context context) {
        this.context = context.getApplicationContext();
        this.requestQueue = Volley.newRequestQueue(this.context);
        this.authManager = AuthManager.getInstance(context);
    }
    
    public static synchronized ApiService getInstance(Context context) {
        if (instance == null) {
            instance = new ApiService(context);
        }
        return instance;
    }
    
    // ============= INTERFACE DEFINITIONS =============
    public interface ApiCallback<T> {
        void onSuccess(T result);
        void onError(String error);
    }
    
    // ============= DASHBOARD METHODS =============
    public void getDashboardStats(ApiCallback<DashboardStats> callback) {
        String url = BASE_URL + "/dashboard/stats";
        
        JsonObjectRequest request = new JsonObjectRequest(
            Request.Method.GET, url, null,
            response -> {
                try {
                    DashboardStats stats = parseDashboardStats(response.getJSONObject("data"));
                    callback.onSuccess(stats);
                } catch (JSONException e) {
                    callback.onError("Error parsing dashboard stats: " + e.getMessage());
                }
            },
            error -> callback.onError(getErrorMessage(error))
        ) {
            @Override
            public Map<String, String> getHeaders() {
                return getAuthHeaders();
            }
        };
        
        requestQueue.add(request);
    }
    
    public void getRecentActivities(ApiCallback<List<Activity>> callback) {
        String url = BASE_URL + "/dashboard/activities";
        
        JsonArrayRequest request = new JsonArrayRequest(
            Request.Method.GET, url, null,
            response -> {
                try {
                    List<Activity> activities = parseActivities(response);
                    callback.onSuccess(activities);
                } catch (JSONException e) {
                    callback.onError("Error parsing activities: " + e.getMessage());
                }
            },
            error -> callback.onError(getErrorMessage(error))
        ) {
            @Override
            public Map<String, String> getHeaders() {
                return getAuthHeaders();
            }
        };
        
        requestQueue.add(request);
    }
    
    // ============= RESIDENTS METHODS =============
    public void getResidents(ApiCallback<List<Resident>> callback) {
        String url = BASE_URL + "/residents";
        
        JsonObjectRequest request = new JsonObjectRequest(
            Request.Method.GET, url, null,
            response -> {
                try {
                    JSONArray residentsArray = response.getJSONObject("data").getJSONArray("items");
                    List<Resident> residents = parseResidents(residentsArray);
                    callback.onSuccess(residents);
                } catch (JSONException e) {
                    callback.onError("Error parsing residents: " + e.getMessage());
                }
            },
            error -> callback.onError(getErrorMessage(error))
        ) {
            @Override
            public Map<String, String> getHeaders() {
                return getAuthHeaders();
            }
        };
        
        requestQueue.add(request);
    }
    
    public void getResident(String residentId, ApiCallback<Resident> callback) {
        String url = BASE_URL + "/residents/" + residentId;
        
        JsonObjectRequest request = new JsonObjectRequest(
            Request.Method.GET, url, null,
            response -> {
                try {
                    Resident resident = parseResident(response.getJSONObject("data"));
                    callback.onSuccess(resident);
                } catch (JSONException e) {
                    callback.onError("Error parsing resident: " + e.getMessage());
                }
            },
            error -> callback.onError(getErrorMessage(error))
        ) {
            @Override
            public Map<String, String> getHeaders() {
                return getAuthHeaders();
            }
        };
        
        requestQueue.add(request);
    }
    
    public void createResident(Resident resident, ApiCallback<Resident> callback) {
        String url = BASE_URL + "/residents";
        
        try {
            JSONObject requestBody = residentToJson(resident);
            
            JsonObjectRequest request = new JsonObjectRequest(
                Request.Method.POST, url, requestBody,
                response -> {
                    try {
                        Resident createdResident = parseResident(response.getJSONObject("data"));
                        callback.onSuccess(createdResident);
                    } catch (JSONException e) {
                        callback.onError("Error parsing created resident: " + e.getMessage());
                    }
                },
                error -> callback.onError(getErrorMessage(error))
            ) {
                @Override
                public Map<String, String> getHeaders() {
                    return getAuthHeaders();
                }
            };
            
            requestQueue.add(request);
        } catch (JSONException e) {
            callback.onError("Error creating request: " + e.getMessage());
        }
    }
    
    public void updateResident(String residentId, Resident resident, ApiCallback<Resident> callback) {
        String url = BASE_URL + "/residents/" + residentId;
        
        try {
            JSONObject requestBody = residentToJson(resident);
            
            JsonObjectRequest request = new JsonObjectRequest(
                Request.Method.PUT, url, requestBody,
                response -> {
                    try {
                        Resident updatedResident = parseResident(response.getJSONObject("data"));
                        callback.onSuccess(updatedResident);
                    } catch (JSONException e) {
                        callback.onError("Error parsing updated resident: " + e.getMessage());
                    }
                },
                error -> callback.onError(getErrorMessage(error))
            ) {
                @Override
                public Map<String, String> getHeaders() {
                    return getAuthHeaders();
                }
            };
            
            requestQueue.add(request);
        } catch (JSONException e) {
            callback.onError("Error creating request: " + e.getMessage());
        }
    }
    
    public void deleteResident(String residentId, ApiCallback<Void> callback) {
        String url = BASE_URL + "/residents/" + residentId;
        
        JsonObjectRequest request = new JsonObjectRequest(
            Request.Method.DELETE, url, null,
            response -> callback.onSuccess(null),
            error -> callback.onError(getErrorMessage(error))
        ) {
            @Override
            public Map<String, String> getHeaders() {
                return getAuthHeaders();
            }
        };
        
        requestQueue.add(request);
    }
    
    // ============= PAYMENTS METHODS =============
    public void getPayments(ApiCallback<List<Payment>> callback) {
        String url = BASE_URL + "/payments";
        
        JsonArrayRequest request = new JsonArrayRequest(
            Request.Method.GET, url, null,
            response -> {
                try {
                    List<Payment> payments = parsePayments(response);
                    callback.onSuccess(payments);
                } catch (JSONException e) {
                    callback.onError("Error parsing payments: " + e.getMessage());
                }
            },
            error -> callback.onError(getErrorMessage(error))
        ) {
            @Override
            public Map<String, String> getHeaders() {
                return getAuthHeaders();
            }
        };
        
        requestQueue.add(request);
    }
    
    public void processPayment(Payment payment, ApiCallback<Payment> callback) {
        String url = BASE_URL + "/payments";
        
        try {
            JSONObject requestBody = paymentToJson(payment);
            
            JsonObjectRequest request = new JsonObjectRequest(
                Request.Method.POST, url, requestBody,
                response -> {
                    try {
                        Payment processedPayment = parsePayment(response.getJSONObject("data"));
                        callback.onSuccess(processedPayment);
                    } catch (JSONException e) {
                        callback.onError("Error parsing processed payment: " + e.getMessage());
                    }
                },
                error -> callback.onError(getErrorMessage(error))
            ) {
                @Override
                public Map<String, String> getHeaders() {
                    return getAuthHeaders();
                }
            };
            
            requestQueue.add(request);
        } catch (JSONException e) {
            callback.onError("Error creating request: " + e.getMessage());
        }
    }
    
    // ============= WORK ORDERS METHODS =============
    public void getWorkOrders(ApiCallback<List<WorkOrder>> callback) {
        String url = BASE_URL + "/maintenance/work-orders";
        
        JsonArrayRequest request = new JsonArrayRequest(
            Request.Method.GET, url, null,
            response -> {
                try {
                    List<WorkOrder> workOrders = parseWorkOrders(response);
                    callback.onSuccess(workOrders);
                } catch (JSONException e) {
                    callback.onError("Error parsing work orders: " + e.getMessage());
                }
            },
            error -> callback.onError(getErrorMessage(error))
        ) {
            @Override
            public Map<String, String> getHeaders() {
                return getAuthHeaders();
            }
        };
        
        requestQueue.add(request);
    }
    
    public void createWorkOrder(WorkOrder workOrder, ApiCallback<WorkOrder> callback) {
        String url = BASE_URL + "/maintenance/work-orders";
        
        try {
            JSONObject requestBody = workOrderToJson(workOrder);
            
            JsonObjectRequest request = new JsonObjectRequest(
                Request.Method.POST, url, requestBody,
                response -> {
                    try {
                        WorkOrder createdWorkOrder = parseWorkOrder(response.getJSONObject("data"));
                        callback.onSuccess(createdWorkOrder);
                    } catch (JSONException e) {
                        callback.onError("Error parsing created work order: " + e.getMessage());
                    }
                },
                error -> callback.onError(getErrorMessage(error))
            ) {
                @Override
                public Map<String, String> getHeaders() {
                    return getAuthHeaders();
                }
            };
            
            requestQueue.add(request);
        } catch (JSONException e) {
            callback.onError("Error creating request: " + e.getMessage());
        }
    }
    
    // ============= SECURITY METHODS =============
    public void getSecurityEvents(ApiCallback<List<SecurityEvent>> callback) {
        String url = BASE_URL + "/security/events";
        
        JsonArrayRequest request = new JsonArrayRequest(
            Request.Method.GET, url, null,
            response -> {
                try {
                    List<SecurityEvent> events = parseSecurityEvents(response);
                    callback.onSuccess(events);
                } catch (JSONException e) {
                    callback.onError("Error parsing security events: " + e.getMessage());
                }
            },
            error -> callback.onError(getErrorMessage(error))
        ) {
            @Override
            public Map<String, String> getHeaders() {
                return getAuthHeaders();
            }
        };
        
        requestQueue.add(request);
    }
    
    public void getVisitors(ApiCallback<List<Visitor>> callback) {
        String url = BASE_URL + "/security/visitors";
        
        JsonArrayRequest request = new JsonArrayRequest(
            Request.Method.GET, url, null,
            response -> {
                try {
                    List<Visitor> visitors = parseVisitors(response);
                    callback.onSuccess(visitors);
                } catch (JSONException e) {
                    callback.onError("Error parsing visitors: " + e.getMessage());
                }
            },
            error -> callback.onError(getErrorMessage(error))
        ) {
            @Override
            public Map<String, String> getHeaders() {
                return getAuthHeaders();
            }
        };
        
        requestQueue.add(request);
    }
    
    // ============= COMMUNICATION METHODS =============
    public void getMessages(ApiCallback<List<Message>> callback) {
        String url = BASE_URL + "/communication/messages";
        
        JsonArrayRequest request = new JsonArrayRequest(
            Request.Method.GET, url, null,
            response -> {
                try {
                    List<Message> messages = parseMessages(response);
                    callback.onSuccess(messages);
                } catch (JSONException e) {
                    callback.onError("Error parsing messages: " + e.getMessage());
                }
            },
            error -> callback.onError(getErrorMessage(error))
        ) {
            @Override
            public Map<String, String> getHeaders() {
                return getAuthHeaders();
            }
        };
        
        requestQueue.add(request);
    }
    
    public void sendMessage(Message message, ApiCallback<Message> callback) {
        String url = BASE_URL + "/communication/messages";
        
        try {
            JSONObject requestBody = messageToJson(message);
            
            JsonObjectRequest request = new JsonObjectRequest(
                Request.Method.POST, url, requestBody,
                response -> {
                    try {
                        Message sentMessage = parseMessage(response.getJSONObject("data"));
                        callback.onSuccess(sentMessage);
                    } catch (JSONException e) {
                        callback.onError("Error parsing sent message: " + e.getMessage());
                    }
                },
                error -> callback.onError(getErrorMessage(error))
            ) {
                @Override
                public Map<String, String> getHeaders() {
                    return getAuthHeaders();
                }
            };
            
            requestQueue.add(request);
        } catch (JSONException e) {
            callback.onError("Error creating request: " + e.getMessage());
        }
    }
    
    // ============= HELPER METHODS =============
    private Map<String, String> getAuthHeaders() {
        Map<String, String> headers = new HashMap<>();
        headers.put("Content-Type", "application/json");
        
        String token = authManager.getAccessToken();
        if (token != null) {
            headers.put("Authorization", "Bearer " + token);
        }
        
        return headers;
    }
    
    private String getErrorMessage(VolleyError error) {
        if (error.networkResponse != null) {
            try {
                String responseBody = new String(error.networkResponse.data, "utf-8");
                JSONObject jsonObject = new JSONObject(responseBody);
                return jsonObject.optString("error", "Unknown error occurred");
            } catch (Exception e) {
                return "Network error: " + error.getMessage();
            }
        }
        return "Network error: " + error.getMessage();
    }
    
    // ============= PARSING METHODS =============
    private DashboardStats parseDashboardStats(JSONObject json) throws JSONException {
        DashboardStats stats = new DashboardStats();
        stats.setTotalResidents(json.optInt("totalResidents", 0));
        stats.setActiveResidents(json.optInt("activeResidents", 0));
        stats.setPendingPayments(json.optInt("pendingPayments", 0));
        stats.setCompletedPayments(json.optInt("completedPayments", 0));
        stats.setOpenWorkOrders(json.optInt("openWorkOrders", 0));
        stats.setCompletedWorkOrders(json.optInt("completedWorkOrders", 0));
        stats.setSecurityEvents(json.optInt("securityEvents", 0));
        stats.setActiveVisitors(json.optInt("activeVisitors", 0));
        return stats;
    }
    
    private List<Activity> parseActivities(JSONArray jsonArray) throws JSONException {
        List<Activity> activities = new ArrayList<>();
        for (int i = 0; i < jsonArray.length(); i++) {
            JSONObject json = jsonArray.getJSONObject(i);
            Activity activity = new Activity();
            activity.setId(json.optString("id"));
            activity.setType(json.optString("type"));
            activity.setDescription(json.optString("description"));
            activity.setTimestamp(json.optString("timestamp"));
            activity.setUserId(json.optString("userId"));
            activity.setUserName(json.optString("userName"));
            activities.add(activity);
        }
        return activities;
    }
    
    private List<Resident> parseResidents(JSONArray jsonArray) throws JSONException {
        List<Resident> residents = new ArrayList<>();
        for (int i = 0; i < jsonArray.length(); i++) {
            residents.add(parseResident(jsonArray.getJSONObject(i)));
        }
        return residents;
    }
    
    private Resident parseResident(JSONObject json) throws JSONException {
        Resident resident = new Resident();
        resident.setId(json.optString("id"));
        resident.setName(json.optString("name"));
        resident.setEmail(json.optString("email"));
        resident.setPhone(json.optString("phone"));
        resident.setUnitNumber(json.optString("unitNumber"));
        resident.setStatus(json.optString("status"));
        resident.setCreatedAt(json.optString("createdAt"));
        resident.setUpdatedAt(json.optString("updatedAt"));
        
        // Parse emergency contact if present
        if (json.has("emergencyContact")) {
            JSONObject emergencyJson = json.getJSONObject("emergencyContact");
            EmergencyContact contact = new EmergencyContact();
            contact.setName(emergencyJson.optString("name"));
            contact.setPhone(emergencyJson.optString("phone"));
            contact.setRelationship(emergencyJson.optString("relationship"));
            resident.setEmergencyContact(contact);
        }
        
        return resident;
    }
    
    private JSONObject residentToJson(Resident resident) throws JSONException {
        JSONObject json = new JSONObject();
        json.put("name", resident.getName());
        json.put("email", resident.getEmail());
        json.put("phone", resident.getPhone());
        json.put("unitNumber", resident.getUnitNumber());
        json.put("status", resident.getStatus());
        
        if (resident.getEmergencyContact() != null) {
            JSONObject emergencyJson = new JSONObject();
            emergencyJson.put("name", resident.getEmergencyContact().getName());
            emergencyJson.put("phone", resident.getEmergencyContact().getPhone());
            emergencyJson.put("relationship", resident.getEmergencyContact().getRelationship());
            json.put("emergencyContact", emergencyJson);
        }
        
        return json;
    }
    
    private List<Payment> parsePayments(JSONArray jsonArray) throws JSONException {
        List<Payment> payments = new ArrayList<>();
        for (int i = 0; i < jsonArray.length(); i++) {
            payments.add(parsePayment(jsonArray.getJSONObject(i)));
        }
        return payments;
    }
    
    private Payment parsePayment(JSONObject json) throws JSONException {
        Payment payment = new Payment();
        payment.setId(json.optString("id"));
        payment.setResidentId(json.optString("residentId"));
        payment.setResidentName(json.optString("residentName"));
        payment.setAmount(json.optDouble("amount"));
        payment.setMethod(json.optString("method"));
        payment.setDescription(json.optString("description"));
        payment.setStatus(json.optString("status"));
        payment.setDate(json.optString("date"));
        payment.setTransactionId(json.optString("transactionId"));
        return payment;
    }
    
    private JSONObject paymentToJson(Payment payment) throws JSONException {
        JSONObject json = new JSONObject();
        json.put("residentId", payment.getResidentId());
        json.put("amount", payment.getAmount());
        json.put("method", payment.getMethod());
        json.put("description", payment.getDescription());
        return json;
    }
    
    private List<WorkOrder> parseWorkOrders(JSONArray jsonArray) throws JSONException {
        List<WorkOrder> workOrders = new ArrayList<>();
        for (int i = 0; i < jsonArray.length(); i++) {
            workOrders.add(parseWorkOrder(jsonArray.getJSONObject(i)));
        }
        return workOrders;
    }
    
    private WorkOrder parseWorkOrder(JSONObject json) throws JSONException {
        WorkOrder workOrder = new WorkOrder();
        workOrder.setId(json.optString("id"));
        workOrder.setTitle(json.optString("title"));
        workOrder.setDescription(json.optString("description"));
        workOrder.setStatus(json.optString("status"));
        workOrder.setPriority(json.optString("priority"));
        workOrder.setType(json.optString("type"));
        workOrder.setLocation(json.optString("location"));
        workOrder.setAssignedTo(json.optString("assignedTo"));
        workOrder.setCreatedAt(json.optString("createdAt"));
        workOrder.setScheduledDate(json.optString("scheduledDate"));
        return workOrder;
    }
    
    private JSONObject workOrderToJson(WorkOrder workOrder) throws JSONException {
        JSONObject json = new JSONObject();
        json.put("title", workOrder.getTitle());
        json.put("description", workOrder.getDescription());
        json.put("priority", workOrder.getPriority());
        json.put("type", workOrder.getType());
        json.put("location", workOrder.getLocation());
        if (workOrder.getAssignedTo() != null) {
            json.put("assignedTo", workOrder.getAssignedTo());
        }
        if (workOrder.getScheduledDate() != null) {
            json.put("scheduledDate", workOrder.getScheduledDate());
        }
        return json;
    }
    
    private List<SecurityEvent> parseSecurityEvents(JSONArray jsonArray) throws JSONException {
        List<SecurityEvent> events = new ArrayList<>();
        for (int i = 0; i < jsonArray.length(); i++) {
            JSONObject json = jsonArray.getJSONObject(i);
            SecurityEvent event = new SecurityEvent();
            event.setId(json.optString("id"));
            event.setType(json.optString("type"));
            event.setDescription(json.optString("description"));
            event.setLocation(json.optString("location"));
            event.setSeverity(json.optString("severity"));
            event.setTimestamp(json.optString("timestamp"));
            events.add(event);
        }
        return events;
    }
    
    private List<Visitor> parseVisitors(JSONArray jsonArray) throws JSONException {
        List<Visitor> visitors = new ArrayList<>();
        for (int i = 0; i < jsonArray.length(); i++) {
            JSONObject json = jsonArray.getJSONObject(i);
            Visitor visitor = new Visitor();
            visitor.setId(json.optString("id"));
            visitor.setName(json.optString("name"));
            visitor.setPhone(json.optString("phone"));
            visitor.setVisitingUnit(json.optString("visitingUnit"));
            visitor.setVisitDate(json.optString("visitDate"));
            visitor.setVisitTime(json.optString("visitTime"));
            visitor.setPurpose(json.optString("purpose"));
            visitor.setStatus(json.optString("status"));
            visitors.add(visitor);
        }
        return visitors;
    }
    
    private List<Message> parseMessages(JSONArray jsonArray) throws JSONException {
        List<Message> messages = new ArrayList<>();
        for (int i = 0; i < jsonArray.length(); i++) {
            messages.add(parseMessage(jsonArray.getJSONObject(i)));
        }
        return messages;
    }
    
    private Message parseMessage(JSONObject json) throws JSONException {
        Message message = new Message();
        message.setId(json.optString("id"));
        message.setSenderName(json.optString("senderName"));
        message.setSubject(json.optString("subject"));
        message.setContent(json.optString("content"));
        message.setTimestamp(json.optString("timestamp"));
        message.setRead(json.optBoolean("isRead", false));
        message.setPriority(json.optString("priority"));
        return message;
    }
    
    private JSONObject messageToJson(Message message) throws JSONException {
        JSONObject json = new JSONObject();
        json.put("recipientType", message.getRecipientType());
        if (message.getRecipientId() != null) {
            json.put("recipientId", message.getRecipientId());
        }
        json.put("subject", message.getSubject());
        json.put("content", message.getContent());
        json.put("priority", message.getPriority());
        return json;
    }
}

// ============= AUTH MANAGER =============
package com.condoconnectai.utils;

import android.content.Context;
import android.content.SharedPreferences;
import com.amazonaws.mobileconnectors.cognitoidentityprovider.*;
import com.amazonaws.mobileconnectors.cognitoidentityprovider.continuations.*;
import com.amazonaws.mobileconnectors.cognitoidentityprovider.handlers.*;
import com.amazonaws.regions.Regions;
import com.condoconnectai.models.User;

public class AuthManager {
    private static AuthManager instance;
    private Context context;
    private CognitoUserPool userPool;
    private CognitoUser currentUser;
    private SharedPreferences sharedPreferences;
    
    private static final String USER_POOL_ID = "us-east-1_XXXXXXXXX";
    private static final String CLIENT_ID = "XXXXXXXXXXXXXXXXXXXXXXXXXX";
    private static final String PREFS_NAME = "CondoconnectAI_Prefs";
    private static final String KEY_ACCESS_TOKEN = "access_token";
    private static final String KEY_REFRESH_TOKEN = "refresh_token";
    private static final String KEY_USER_ID = "user_id";
    private static final String KEY_USER_NAME = "user_name";
    private static final String KEY_USER_EMAIL = "user_email";
    
    private AuthManager(Context context) {
        this.context = context.getApplicationContext();
        this.sharedPreferences = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        
        CognitoUserPoolsSignInHandler cognitoUserPoolsSignInHandler = new CognitoUserPoolsSignInHandler() {
            @Override
            public void onSuccess(CognitoUserSession userSession) {
                // Handle successful sign in
            }
            
            @Override
            public void getAuthenticationDetails(AuthenticationContinuation authenticationContinuation, String userId) {
                // Handle authentication details request
            }
            
            @Override
            public void getMFACode(MultiFactorAuthenticationContinuation continuation) {
                // Handle MFA if enabled
            }
            
            @Override
            public void authenticationChallenge(ChallengeContinuation continuation) {
                // Handle authentication challenges
            }
            
            @Override
            public void onFailure(Exception exception) {
                // Handle sign in failure
            }
        };
        
        userPool = new CognitoUserPool(context, USER_POOL_ID, CLIENT_ID, null, Regions.US_EAST_1);
    }
    
    public static synchronized AuthManager getInstance(Context context) {
        if (instance == null) {
            instance = new AuthManager(context);
        }
        return instance;
    }
    
    public interface AuthCallback {
        void onSuccess(User user);
        void onError(String error);
    }
    
    public void signIn(String email, String password, AuthCallback callback) {
        currentUser = userPool.getUser(email);
        
        AuthenticationHandler authenticationHandler = new AuthenticationHandler() {
            @Override
            public void onSuccess(CognitoUserSession userSession, CognitoDevice newDevice) {
                // Save tokens
                saveTokens(userSession);
                
                // Get user attributes
                currentUser.getDetailsInBackground(new GetDetailsHandler() {
                    @Override
                    public void onSuccess(CognitoUserDetails cognitoUserDetails) {
                        User user = createUserFromDetails(cognitoUserDetails, userSession);
                        saveUserInfo(user);
                        callback.onSuccess(user);
                    }
                    
                    @Override
                    public void onFailure(Exception exception) {
                        callback.onError("Failed to get user details: " + exception.getMessage());
                    }
                });
            }
            
            @Override
            public void getAuthenticationDetails(AuthenticationContinuation authenticationContinuation, String userId) {
                AuthenticationDetails authenticationDetails = new AuthenticationDetails(userId, password, null);
                authenticationContinuation.setAuthenticationDetails(authenticationDetails);
                authenticationContinuation.continueTask();
            }
            
            @Override
            public void getMFACode(MultiFactorAuthenticationContinuation continuation) {
                // Handle MFA if needed
                callback.onError("MFA not supported in this version");
            }
            
            @Override
            public void authenticationChallenge(ChallengeContinuation continuation) {
                // Handle authentication challenges
                callback.onError("Authentication challenge not supported");
            }
            
            @Override
            public void onFailure(Exception exception) {
                callback.onError("Authentication failed: " + exception.getMessage());
            }
        };
        
        currentUser.getSessionInBackground(authenticationHandler);
    }
    
    public void signUp(String email, String password, String name, String phone, AuthCallback callback) {
        CognitoUserAttributes userAttributes = new CognitoUserAttributes();
        userAttributes.addAttribute("email", email);
        userAttributes.addAttribute("name", name);
        userAttributes.addAttribute("phone_number", phone);
        
        SignUpHandler signUpHandler = new SignUpHandler() {
            @Override
            public void onSuccess(CognitoUser user, SignUpResult signUpResult) {
                if (signUpResult.getUserConfirmed()) {
                    // User is confirmed, can sign in
                    signIn(email, password, callback);
                } else {
                    // User needs to confirm email
                    callback.onError("Please check your email and confirm your account");
                }
            }
            
            @Override
            public void onFailure(Exception exception) {
                callback.onError("Sign up failed: " + exception.getMessage());
            }
        };
        
        userPool.signUpInBackground(email, password, userAttributes, null, signUpHandler);
    }
    
    public void confirmSignUp(String email, String confirmationCode, AuthCallback callback) {
        CognitoUser user = userPool.getUser(email);
        
        GenericHandler confirmationHandler = new GenericHandler() {
            @Override
            public void onSuccess() {
                callback.onSuccess(null);
            }
            
            @Override
            public void onFailure(Exception exception) {
                callback.onError("Confirmation failed: " + exception.getMessage());
            }
        };
        
        user.confirmSignUpInBackground(confirmationCode, false, confirmationHandler);
    }
    
    public void forgotPassword(String email, AuthCallback callback) {
        CognitoUser user = userPool.getUser(email);
        
        ForgotPasswordHandler forgotPasswordHandler = new ForgotPasswordHandler() {
            @Override
            public void onSuccess() {
                callback.onSuccess(null);
            }
            
            @Override
            public void getResetCode(ForgotPasswordContinuation continuation) {
                // Password reset code will be sent to user's email
                callback.onSuccess(null);
            }
            
            @Override
            public void onFailure(Exception exception) {
                callback.onError("Password reset failed: " + exception.getMessage());
            }
        };
        
        user.forgotPasswordInBackground(forgotPasswordHandler);
    }
    
    public void confirmForgotPassword(String email, String confirmationCode, String newPassword, AuthCallback callback) {
        CognitoUser user = userPool.getUser(email);
        
        ForgotPasswordHandler confirmHandler = new ForgotPasswordHandler() {
            @Override
            public void onSuccess() {
                callback.onSuccess(null);
            }
            
            @Override
            public void getResetCode(ForgotPasswordContinuation continuation) {
                continuation.setPassword(newPassword);
                continuation.setVerificationCode(confirmationCode);
                continuation.continueTask();
            }
            
            @Override
            public void onFailure(Exception exception) {
                callback.onError("Password confirmation failed: " + exception.getMessage());
            }
        };
        
        user.forgotPasswordInBackground(confirmHandler);
    }
    
    public void signOut() {
        if (currentUser != null) {
            currentUser.signOut();
        }
        clearStoredData();
    }
    
    public boolean isUserLoggedIn() {
        String accessToken = sharedPreferences.getString(KEY_ACCESS_TOKEN, null);
        return accessToken != null && !accessToken.isEmpty();
    }
    
    public User getCurrentUser() {
        if (isUserLoggedIn()) {
            User user = new User();
            user.setId(sharedPreferences.getString(KEY_USER_ID, ""));
            user.setName(sharedPreferences.getString(KEY_USER_NAME, ""));
            user.setEmail(sharedPreferences.getString(KEY_USER_EMAIL, ""));
            return user;
        }
        return null;
    }
    
    public String getAccessToken() {
        return sharedPreferences.getString(KEY_ACCESS_TOKEN, null);
    }
    
    private void saveTokens(CognitoUserSession userSession) {
        SharedPreferences.Editor editor = sharedPreferences.edit();
        editor.putString(KEY_ACCESS_TOKEN, userSession.getAccessToken().getJWTToken());
        editor.putString(KEY_REFRESH_TOKEN, userSession.getRefreshToken().getToken());
        editor.apply();
    }
    
    private void saveUserInfo(User user) {
        SharedPreferences.Editor editor = sharedPreferences.edit();
        editor.putString(KEY_USER_ID, user.getId());
        editor.putString(KEY_USER_NAME, user.getName());
        editor.putString(KEY_USER_EMAIL, user.getEmail());
        editor.apply();
    }
    
    private User createUserFromDetails(CognitoUserDetails details, CognitoUserSession session) {
        User user = new User();
        user.setId(session.getAccessToken().getUsername());
        user.setName(details.getAttributes().getAttributes().get("name"));
        user.setEmail(details.getAttributes().getAttributes().get("email"));
        user.setPhone(details.getAttributes().getAttributes().get("phone_number"));
        return user;
    }
    
    private void clearStoredData() {
        SharedPreferences.Editor editor = sharedPreferences.edit();
        editor.clear();
        editor.apply();
    }
}

// ============= VALIDATION UTILS =============
package com.condoconnectai.utils;

import java.util.regex.Pattern;

public class ValidationUtils {
    
    private static final Pattern EMAIL_PATTERN = Pattern.compile(
        "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$"
    );
    
    private static final Pattern PHONE_PATTERN = Pattern.compile(
        "^[+]?[1-9]\\d{1,14}$"
    );
    
    public static boolean isEmailValid(String email) {
        return email != null && EMAIL_PATTERN.matcher(email).matches();
    }
    
    public static boolean isPasswordValid(String password) {
        if (password == null || password.length() < 8) {
            return false;
        }
        
        boolean hasUpper = false;
        boolean hasLower = false;
        boolean hasDigit = false;
        boolean hasSpecial = false;
        
        for (char c : password.toCharArray()) {
            if (Character.isUpperCase(c)) {
                hasUpper = true;
            } else if (Character.isLowerCase(c)) {
                hasLower = true;
            } else if (Character.isDigit(c)) {
                hasDigit = true;
            } else if (!Character.isLetterOrDigit(c)) {
                hasSpecial = true;
            }
        }
        
        return hasUpper && hasLower && hasDigit && hasSpecial;
    }
    
    public static boolean isPhoneValid(String phone) {
        return phone != null && PHONE_PATTERN.matcher(phone).matches();
    }
    
    public static boolean isNameValid(String name) {
        return name != null && name.trim().length() >= 2;
    }
    
    public static boolean isUnitNumberValid(String unitNumber) {
        return unitNumber != null && unitNumber.trim().length() > 0;
    }
    
    public static boolean isAmountValid(double amount) {
        return amount > 0 && amount <= 1000000;
    }
    
    public static String getPasswordStrength(String password) {
        if (password == null || password.length() < 6) {
            return "Muy débil";
        }
        
        int score = 0;
        
        if (password.length() >= 8) score++;
        if (password.matches(".*[a-z].*")) score++;
        if (password.matches(".*[A-Z].*")) score++;
        if (password.matches(".*\\d.*")) score++;
        if (password.matches(".*[!@#$%^&*(),.?\":{}|<>].*")) score++;
        
        switch (score) {
            case 0:
            case 1:
                return "Muy débil";
            case 2:
                return "Débil";
            case 3:
                return "Regular";
            case 4:
                return "Fuerte";
            case 5:
                return "Muy fuerte";
            default:
                return "Desconocido";
        }
    }
}

// ============= NETWORK UTILS =============
package com.condoconnectai.utils;

import android.content.Context;
import android.net.ConnectivityManager;
import android.net.NetworkInfo;

public class NetworkUtils {
    
    public static boolean isNetworkAvailable(Context context) {
        ConnectivityManager connectivityManager = 
            (ConnectivityManager) context.getSystemService(Context.CONNECTIVITY_SERVICE);
        
        if (connectivityManager != null) {
            NetworkInfo activeNetworkInfo = connectivityManager.getActiveNetworkInfo();
            return activeNetworkInfo != null && activeNetworkInfo.isConnected();
        }
        
        return false;
    }
    
    public static boolean isWifiConnected(Context context) {
        ConnectivityManager connectivityManager = 
            (ConnectivityManager) context.getSystemService(Context.CONNECTIVITY_SERVICE);
        
        if (connectivityManager != null) {
            NetworkInfo wifiInfo = connectivityManager.getNetworkInfo(ConnectivityManager.TYPE_WIFI);
            return wifiInfo != null && wifiInfo.isConnected();
        }
        
        return false;
    }
    
    public static boolean isMobileConnected(Context context) {
        ConnectivityManager connectivityManager = 
            (ConnectivityManager) context.getSystemService(Context.CONNECTIVITY_SERVICE);
        
        if (connectivityManager != null) {
            NetworkInfo mobileInfo = connectivityManager.getNetworkInfo(ConnectivityManager.TYPE_MOBILE);
            return mobileInfo != null && mobileInfo.isConnected();
        }
        
        return false;
    }
    
    public static String getNetworkType(Context context) {
        ConnectivityManager connectivityManager = 
            (ConnectivityManager) context.getSystemService(Context.CONNECTIVITY_SERVICE);
        
        if (connectivityManager != null) {
            NetworkInfo activeNetworkInfo = connectivityManager.getActiveNetworkInfo();
            if (activeNetworkInfo != null && activeNetworkInfo.isConnected()) {
                if (activeNetworkInfo.getType() == ConnectivityManager.TYPE_WIFI) {
                    return "WiFi";
                } else if (activeNetworkInfo.getType() == ConnectivityManager.TYPE_MOBILE) {
                    return "Mobile";
                }
            }
        }
        
        return "No Connection";
    }
}
