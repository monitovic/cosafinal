package com.condoconnectai;

import android.content.Intent;
import android.os.Bundle;
import android.util.Log;
import android.widget.*;
import androidx.appcompat.app.AppCompatActivity;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;
import com.amazonaws.services.dynamodbv2.AmazonDynamoDBClient;
import com.amazonaws.services.dynamodbv2.model.*;
import com.amazonaws.services.s3.AmazonS3Client;
import com.amazonaws.services.sns.AmazonSNSClient;
import java.util.*;

// ============= COMMUNICATION ACTIVITY =============
class CommunicationActivity extends AppCompatActivity {
    private static final String TAG = "CommunicationActivity";
    private RecyclerView messagesRecycler;
    private RecyclerView announcementsRecycler;
    private Button sendMessageButton;
    private Button createAnnouncementButton;
    private EditText messageEditText;
    private Spinner recipientSpinner;
    private MessageAdapter messageAdapter;
    private AnnouncementAdapter announcementAdapter;
    private AmazonDynamoDBClient dynamoDBClient;
    private AmazonSNSClient snsClient;
    private List<Message> messages;
    private List<Announcement> announcements;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_communication);
        
        initializeViews();
        setupRecyclerViews();
        loadCommunicationData();
    }

    private void initializeViews() {
        messagesRecycler = findViewById(R.id.messagesRecycler);
        announcementsRecycler = findViewById(R.id.announcementsRecycler);
        sendMessageButton = findViewById(R.id.sendMessageButton);
        createAnnouncementButton = findViewById(R.id.createAnnouncementButton);
        messageEditText = findViewById(R.id.messageEditText);
        recipientSpinner = findViewById(R.id.recipientSpinner);
        
        sendMessageButton.setOnClickListener(v -> sendMessage());
        createAnnouncementButton.setOnClickListener(v -> createAnnouncement());
    }

    private void setupRecyclerViews() {
        messages = new ArrayList<>();
        messageAdapter = new MessageAdapter(messages, this::onMessageClick);
        messagesRecycler.setLayoutManager(new LinearLayoutManager(this));
        messagesRecycler.setAdapter(messageAdapter);
        
        announcements = new ArrayList<>();
        announcementAdapter = new AnnouncementAdapter(announcements, this::onAnnouncementClick);
        announcementsRecycler.setLayoutManager(new LinearLayoutManager(this));
        announcementsRecycler.setAdapter(announcementAdapter);
    }

    private void loadCommunicationData() {
        new Thread(() -> {
            try {
                loadMessages();
                loadAnnouncements();
            } catch (Exception e) {
                Log.e(TAG, "Error loading communication data", e);
            }
        }).start();
    }

    private void loadMessages() {
        try {
            String userId = getCurrentUserId();
            QueryRequest queryRequest = new QueryRequest()
                .withTableName("CondoconnectAI-Messages")
                .withIndexName("RecipientIndex")
                .withKeyConditionExpression("recipient_id = :userId")
                .withExpressionAttributeValues(Map.of(":userId", new AttributeValue(userId)))
                .withScanIndexForward(false)
                .withLimit(50);
            
            QueryResult result = dynamoDBClient.query(queryRequest);
            List<Message> loadedMessages = new ArrayList<>();
            
            for (Map<String, AttributeValue> item : result.getItems()) {
                Message message = new Message();
                message.setId(item.get("message_id").getS());
                message.setSenderId(item.get("sender_id").getS());
                message.setSenderName(item.get("sender_name").getS());
                message.setSubject(item.get("subject").getS());
                message.setContent(item.get("content").getS());
                message.setTimestamp(item.get("timestamp").getS());
                message.setRead(Boolean.parseBoolean(item.get("is_read").getS()));
                loadedMessages.add(message);
            }
            
            runOnUiThread(() -> {
                messages.clear();
                messages.addAll(loadedMessages);
                messageAdapter.notifyDataSetChanged();
            });
        } catch (Exception e) {
            Log.e(TAG, "Error loading messages", e);
        }
    }

    private void loadAnnouncements() {
        try {
            String tenantId = getCurrentTenantId();
            QueryRequest queryRequest = new QueryRequest()
                .withTableName("CondoconnectAI-Announcements")
                .withIndexName("TenantIndex")
                .withKeyConditionExpression("tenant_id = :tenantId")
                .withExpressionAttributeValues(Map.of(":tenantId", new AttributeValue(tenantId)))
                .withScanIndexForward(false)
                .withLimit(20);
            
            QueryResult result = dynamoDBClient.query(queryRequest);
            List<Announcement> loadedAnnouncements = new ArrayList<>();
            
            for (Map<String, AttributeValue> item : result.getItems()) {
                Announcement announcement = new Announcement();
                announcement.setId(item.get("announcement_id").getS());
                announcement.setTitle(item.get("title").getS());
                announcement.setContent(item.get("content").getS());
                announcement.setAuthor(item.get("author").getS());
                announcement.setTimestamp(item.get("timestamp").getS());
                announcement.setPriority(item.get("priority").getS());
                loadedAnnouncements.add(announcement);
            }
            
            runOnUiThread(() -> {
                announcements.clear();
                announcements.addAll(loadedAnnouncements);
                announcementAdapter.notifyDataSetChanged();
            });
        } catch (Exception e) {
            Log.e(TAG, "Error loading announcements", e);
        }
    }

    private void sendMessage() {
        String content = messageEditText.getText().toString().trim();
        if (content.isEmpty()) {
            showError("Por favor, escriba un mensaje");
            return;
        }
        
        new Thread(() -> {
            try {
                String messageId = "msg_" + System.currentTimeMillis();
                String recipientId = getSelectedRecipientId();
                
                Map<String, AttributeValue> item = Map.of(
                    "message_id", new AttributeValue(messageId),
                    "sender_id", new AttributeValue(getCurrentUserId()),
                    "sender_name", new AttributeValue(getCurrentUserName()),
                    "recipient_id", new AttributeValue(recipientId),
                    "subject", new AttributeValue("Mensaje desde la app"),
                    "content", new AttributeValue(content),
                    "timestamp", new AttributeValue(String.valueOf(System.currentTimeMillis())),
                    "is_read", new AttributeValue("false")
                );
                
                PutItemRequest putItemRequest = new PutItemRequest()
                    .withTableName("CondoconnectAI-Messages")
                    .withItem(item);
                
                dynamoDBClient.putItem(putItemRequest);
                
                // Enviar notificación push
                sendPushNotification(recipientId, "Nuevo mensaje", content);
                
                runOnUiThread(() -> {
                    messageEditText.setText("");
                    showSuccess("Mensaje enviado exitosamente");
                });
                
            } catch (Exception e) {
                Log.e(TAG, "Error sending message", e);
                runOnUiThread(() -> showError("Error enviando mensaje"));
            }
        }).start();
    }

    private void createAnnouncement() {
        CreateAnnouncementDialog dialog = new CreateAnnouncementDialog(this, this::onAnnouncementCreated);
        dialog.show();
    }

    private void onAnnouncementCreated(Announcement announcement) {
        new Thread(() -> {
            try {
                String announcementId = "ann_" + System.currentTimeMillis();
                
                Map<String, AttributeValue> item = Map.of(
                    "announcement_id", new AttributeValue(announcementId),
                    "tenant_id", new AttributeValue(getCurrentTenantId()),
                    "title", new AttributeValue(announcement.getTitle()),
                    "content", new AttributeValue(announcement.getContent()),
                    "author", new AttributeValue(getCurrentUserName()),
                    "timestamp", new AttributeValue(String.valueOf(System.currentTimeMillis())),
                    "priority", new AttributeValue(announcement.getPriority())
                );
                
                PutItemRequest putItemRequest = new PutItemRequest()
                    .withTableName("CondoconnectAI-Announcements")
                    .withItem(item);
                
                dynamoDBClient.putItem(putItemRequest);
                
                runOnUiThread(() -> {
                    announcements.add(0, announcement);
                    announcementAdapter.notifyItemInserted(0);
                    showSuccess("Anuncio creado exitosamente");
                });
                
            } catch (Exception e) {
                Log.e(TAG, "Error creating announcement", e);
                runOnUiThread(() -> showError("Error creando anuncio"));
            }
        }).start();
    }

    private void sendPushNotification(String recipientId, String title, String message) {
        // Implementar envío de notificación push via SNS
    }

    private void onMessageClick(Message message) {
        MessageDetailDialog dialog = new MessageDetailDialog(this, message);
        dialog.show();
    }

    private void onAnnouncementClick(Announcement announcement) {
        AnnouncementDetailDialog dialog = new AnnouncementDetailDialog(this, announcement);
        dialog.show();
    }

    private String getCurrentUserId() {
        return getSharedPreferences("CondoconnectAI", MODE_PRIVATE).getString("user_id", "");
    }

    private String getCurrentUserName() {
        return getSharedPreferences("CondoconnectAI", MODE_PRIVATE).getString("user_name", "");
    }

    private String getCurrentTenantId() {
        return getSharedPreferences("CondoconnectAI", MODE_PRIVATE).getString("tenant_id", "");
    }

    private String getSelectedRecipientId() {
        return "admin_user"; // Simplificado para el ejemplo
    }

    private void showError(String message) {
        Toast.makeText(this, message, Toast.LENGTH_LONG).show();
    }

    private void showSuccess(String message) {
        Toast.makeText(this, message, Toast.LENGTH_SHORT).show();
    }
}

// ============= REPORTS ACTIVITY =============
class ReportsActivity extends AppCompatActivity {
    private static final String TAG = "ReportsActivity";
    private Spinner reportTypeSpinner;
    private Button generateReportButton;
    private Button downloadReportButton;
    private RecyclerView reportsRecycler;
    private ReportAdapter reportAdapter;
    private AmazonDynamoDBClient dynamoDBClient;
    private AmazonS3Client s3Client;
    private List<Report> reports;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_reports);
        
        initializeViews();
        setupRecyclerView();
        loadReports();
    }

    private void initializeViews() {
        reportTypeSpinner = findViewById(R.id.reportTypeSpinner);
        generateReportButton = findViewById(R.id.generateReportButton);
        downloadReportButton = findViewById(R.id.downloadReportButton);
        reportsRecycler = findViewById(R.id.reportsRecycler);
        
        setupReportTypeSpinner();
        generateReportButton.setOnClickListener(v -> generateReport());
        downloadReportButton.setOnClickListener(v -> downloadSelectedReport());
    }

    private void setupReportTypeSpinner() {
        String[] reportTypes = {"Financiero", "Operacional", "Mantenimiento", "Seguridad", "Residentes"};
        ArrayAdapter<String> adapter = new ArrayAdapter<>(this, android.R.layout.simple_spinner_item, reportTypes);
        adapter.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item);
        reportTypeSpinner.setAdapter(adapter);
    }

    private void setupRecyclerView() {
        reports = new ArrayList<>();
        reportAdapter = new ReportAdapter(reports, this::onReportClick);
        reportsRecycler.setLayoutManager(new LinearLayoutManager(this));
        reportsRecycler.setAdapter(reportAdapter);
    }

    private void loadReports() {
        new Thread(() -> {
            try {
                String tenantId = getCurrentTenantId();
                
                QueryRequest queryRequest = new QueryRequest()
                    .withTableName("CondoconnectAI-Reports")
                    .withIndexName("TenantIndex")
                    .withKeyConditionExpression("tenant_id = :tenantId")
                    .withExpressionAttributeValues(Map.of(":tenantId", new AttributeValue(tenantId)))
                    .withScanIndexForward(false)
                    .withLimit(50);
                
                QueryResult result = dynamoDBClient.query(queryRequest);
                List<Report> loadedReports = new ArrayList<>();
                
                for (Map<String, AttributeValue> item : result.getItems()) {
                    Report report = new Report();
                    report.setId(item.get("report_id").getS());
                    report.setName(item.get("name").getS());
                    report.setType(item.get("type").getS());
                    report.setStatus(item.get("status").getS());
                    report.setCreatedAt(item.get("created_at").getS());
                    report.setFileUrl(item.get("file_url").getS());
                    loadedReports.add(report);
                }
                
                runOnUiThread(() -> {
                    reports.clear();
                    reports.addAll(loadedReports);
                    reportAdapter.notifyDataSetChanged();
                });
                
            } catch (Exception e) {
                Log.e(TAG, "Error loading reports", e);
            }
        }).start();
    }

    private void generateReport() {
        String reportType = reportTypeSpinner.getSelectedItem().toString();
        
        new Thread(() -> {
            try {
                String reportId = "report_" + System.currentTimeMillis();
                
                // Crear entrada en DynamoDB
                Map<String, AttributeValue> item = Map.of(
                    "report_id", new AttributeValue(reportId),
                    "tenant_id", new AttributeValue(getCurrentTenantId()),
                    "name", new AttributeValue("Reporte " + reportType + " - " + getCurrentDate()),
                    "type", new AttributeValue(reportType.toLowerCase()),
                    "status", new AttributeValue("generating"),
                    "created_at", new AttributeValue(String.valueOf(System.currentTimeMillis())),
                    "created_by", new AttributeValue(getCurrentUserId())
                );
                
                PutItemRequest putItemRequest = new PutItemRequest()
                    .withTableName("CondoconnectAI-Reports")
                    .withItem(item);
                
                dynamoDBClient.putItem(putItemRequest);
                
                // Simular generación de reporte
                Thread.sleep(3000);
                
                // Actualizar estado a completado
                UpdateItemRequest updateRequest = new UpdateItemRequest()
                    .withTableName("CondoconnectAI-Reports")
                    .withKey(Map.of("report_id", new AttributeValue(reportId)))
                    .withUpdateExpression("SET #status = :status, file_url = :url")
                    .withExpressionAttributeNames(Map.of("#status", "status"))
                    .withExpressionAttributeValues(Map.of(
                        ":status", new AttributeValue("completed"),
                        ":url", new AttributeValue("https://s3.amazonaws.com/reports/" + reportId + ".pdf")
                    ));
                
                dynamoDBClient.updateItem(updateRequest);
                
                runOnUiThread(() -> {
                    showSuccess("Reporte generado exitosamente");
                    loadReports();
                });
                
            } catch (Exception e) {
                Log.e(TAG, "Error generating report", e);
                runOnUiThread(() -> showError("Error generando reporte"));
            }
        }).start();
    }

    private void downloadSelectedReport() {
        // Implementar descarga de reporte seleccionado
        showSuccess("Función de descarga no implementada aún");
    }

    private void onReportClick(Report report) {
        ReportDetailDialog dialog = new ReportDetailDialog(this, report);
        dialog.show();
    }

    private String getCurrentTenantId() {
        return getSharedPreferences("CondoconnectAI", MODE_PRIVATE).getString("tenant_id", "");
    }

    private String getCurrentUserId() {
        return getSharedPreferences("CondoconnectAI", MODE_PRIVATE).getString("user_id", "");
    }

    private String getCurrentDate() {
        return new java.text.SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).format(new Date());
    }

    private void showError(String message) {
        Toast.makeText(this, message, Toast.LENGTH_LONG).show();
    }

    private void showSuccess(String message) {
        Toast.makeText(this, message, Toast.LENGTH_SHORT).show();
    }
}

// ============= BIOMETRIC ACTIVITY =============
class BiometricActivity extends AppCompatActivity {
    private static final String TAG = "BiometricActivity";
    private Button enrollBiometricButton;
    private Button verifyBiometricButton;
    private TextView biometricStatusText;
    private RecyclerView biometricRecordsRecycler;
    private BiometricAdapter biometricAdapter;
    private AmazonDynamoDBClient dynamoDBClient;
    private List<BiometricRecord> biometricRecords;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_biometric);
        
        initializeViews();
        setupRecyclerView();
        loadBiometricData();
    }

    private void initializeViews() {
        enrollBiometricButton = findViewById(R.id.enrollBiometricButton);
        verifyBiometricButton = findViewById(R.id.verifyBiometricButton);
        biometricStatusText = findViewById(R.id.biometricStatusText);
        biometricRecordsRecycler = findViewById(R.id.biometricRecordsRecycler);
        
        enrollBiometricButton.setOnClickListener(v -> enrollBiometric());
        verifyBiometricButton.setOnClickListener(v -> verifyBiometric());
    }

    private void setupRecyclerView() {
        biometricRecords = new ArrayList<>();
        biometricAdapter = new BiometricAdapter(biometricRecords);
        biometricRecordsRecycler.setLayoutManager(new LinearLayoutManager(this));
        biometricRecordsRecycler.setAdapter(biometricAdapter);
    }

    private void loadBiometricData() {
        new Thread(() -> {
            try {
                String userId = getCurrentUserId();
                
                QueryRequest queryRequest = new QueryRequest()
                    .withTableName("CondoconnectAI-BiometricRecords")
                    .withIndexName("UserIndex")
                    .withKeyConditionExpression("user_id = :userId")
                    .withExpressionAttributeValues(Map.of(":userId", new AttributeValue(userId)))
                    .withScanIndexForward(false);
                
                QueryResult result = dynamoDBClient.query(queryRequest);
                List<BiometricRecord> loadedRecords = new ArrayList<>();
                
                for (Map<String, AttributeValue> item : result.getItems()) {
                    BiometricRecord record = new BiometricRecord();
                    record.setId(item.get("record_id").getS());
                    record.setType(item.get("biometric_type").getS());
                    record.setStatus(item.get("status").getS());
                    record.setTimestamp(item.get("timestamp").getS());
                    record.setAction(item.get("action").getS());
                    loadedRecords.add(record);
                }
                
                runOnUiThread(() -> {
                    biometricRecords.clear();
                    biometricRecords.addAll(loadedRecords);
                    biometricAdapter.notifyDataSetChanged();
                    updateBiometricStatus();
                });
                
            } catch (Exception e) {
                Log.e(TAG, "Error loading biometric data", e);
            }
        }).start();
    }

    private void enrollBiometric() {
        // Implementar registro biométrico
        new Thread(() -> {
            try {
                String recordId = "bio_" + System.currentTimeMillis();
                
                Map<String, AttributeValue> item = Map.of(
                    "record_id", new AttributeValue(recordId),
                    "user_id", new AttributeValue(getCurrentUserId()),
                    "biometric_type", new AttributeValue("fingerprint"),
                    "status", new AttributeValue("enrolled"),
                    "timestamp", new AttributeValue(String.valueOf(System.currentTimeMillis())),
                    "action", new AttributeValue("enrollment")
                );
                
                PutItemRequest putItemRequest = new PutItemRequest()
                    .withTableName("CondoconnectAI-BiometricRecords")
                    .withItem(item);
                
                dynamoDBClient.putItem(putItemRequest);
                
                runOnUiThread(() -> {
                    showSuccess("Biométrico registrado exitosamente");
                    loadBiometricData();
                });
                
            } catch (Exception e) {
                Log.e(TAG, "Error enrolling biometric", e);
                runOnUiThread(() -> showError("Error registrando biométrico"));
            }
        }).start();
    }

    private void verifyBiometric() {
        // Implementar verificación biométrica
        new Thread(() -> {
            try {
                String recordId = "bio_verify_" + System.currentTimeMillis();
                
                Map<String, AttributeValue> item = Map.of(
                    "record_id", new AttributeValue(recordId),
                    "user_id", new AttributeValue(getCurrentUserId()),
                    "biometric_type", new AttributeValue("fingerprint"),
                    "status", new AttributeValue("verified"),
                    "timestamp", new AttributeValue(String.valueOf(System.currentTimeMillis())),
                    "action", new AttributeValue("verification")
                );
                
                PutItemRequest putItemRequest = new PutItemRequest()
                    .withTableName("CondoconnectAI-BiometricRecords")
                    .withItem(item);
                
                dynamoDBClient.putItem(putItemRequest);
                
                runOnUiThread(() -> {
                    showSuccess("Verificación biométrica exitosa");
                    loadBiometricData();
                });
                
            } catch (Exception e) {
                Log.e(TAG, "Error verifying biometric", e);
                runOnUiThread(() -> showError("Error en verificación biométrica"));
            }
        }).start();
    }

    private void updateBiometricStatus() {
        boolean hasEnrolledBiometric = biometricRecords.stream()
            .anyMatch(record -> "enrolled".equals(record.getStatus()));
        
        if (hasEnrolledBiometric) {
            biometricStatusText.setText("Estado: Biométrico Registrado");
            biometricStatusText.setTextColor(getColor(android.R.color.holo_green_dark));
        } else {
            biometricStatusText.setText("Estado: Sin Registro Biométrico");
            biometricStatusText.setTextColor(getColor(android.R.color.holo_red_dark));
        }
    }

    private String getCurrentUserId() {
        return getSharedPreferences("CondoconnectAI", MODE_PRIVATE).getString("user_id", "");
    }

    private void showError(String message) {
        Toast.makeText(this, message, Toast.LENGTH_LONG).show();
    }

    private void showSuccess(String message) {
        Toast.makeText(this, message, Toast.LENGTH_SHORT).show();
    }
}

// ============= ACCESS CONTROL ACTIVITY =============
class AccessControlActivity extends AppCompatActivity {
    private static final String TAG = "AccessControlActivity";
    private Button grantAccessButton;
    private Button revokeAccessButton;
    private RecyclerView accessLogsRecycler;
    private AccessLogAdapter accessLogAdapter;
    private AmazonDynamoDBClient dynamoDBClient;
    private List<AccessLog> accessLogs;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_access_control);
        
        initializeViews();
        setupRecyclerView();
        loadAccessLogs();
    }

    private void initializeViews() {
        grantAccessButton = findViewById(R.id.grantAccessButton);
        revokeAccessButton = findViewById(R.id.revokeAccessButton);
        accessLogsRecycler = findViewById(R.id.accessLogsRecycler);
        
        grantAccessButton.setOnClickListener(v -> grantAccess());
        revokeAccessButton.setOnClickListener(v -> revokeAccess());
    }

    private void setupRecyclerView() {
        accessLogs = new ArrayList<>();
        accessLogAdapter = new AccessLogAdapter(accessLogs);
        accessLogsRecycler.setLayoutManager(new LinearLayoutManager(this));
        accessLogsRecycler.setAdapter(accessLogAdapter);
    }

    private void loadAccessLogs() {
        new Thread(() -> {
            try {
                String tenantId = getCurrentTenantId();
                
                QueryRequest queryRequest = new QueryRequest()
                    .withTableName("CondoconnectAI-AccessLogs")
                    .withIndexName("TenantIndex")
                    .withKeyConditionExpression("tenant_id = :tenantId")
                    .withExpressionAttributeValues(Map.of(":tenantId", new AttributeValue(tenantId)))
                    .withScanIndexForward(false)
                    .withLimit(100);
                
                QueryResult result = dynamoDBClient.query(queryRequest);
                List<AccessLog> loadedLogs = new ArrayList<>();
                
                for (Map<String, AttributeValue> item : result.getItems()) {
                    AccessLog log = new AccessLog();
                    log.setId(item.get("log_id").getS());
                    log.setUserId(item.get("user_id").getS());
                    log.setUserName(item.get("user_name").getS());
                    log.setAction(item.get("action").getS());
                    log.setLocation(item.get("location").getS());
                    log.setTimestamp(item.get("timestamp").getS());
                    log.setStatus(item.get("status").getS());
                    loadedLogs.add(log);
                }
                
                runOnUiThread(() -> {
                    accessLogs.clear();
                    accessLogs.addAll(loadedLogs);
                    accessLogAdapter.notifyDataSetChanged();
                });
                
            } catch (Exception e) {
                Log.e(TAG, "Error loading access logs", e);
            }
        }).start();
    }

    private void grantAccess() {
        // Implementar concesión de acceso
        logAccessAction("grant", "success");
        showSuccess("Acceso concedido");
    }

    private void revokeAccess() {
        // Implementar revocación de acceso
        logAccessAction("revoke", "success");
        showSuccess("Acceso revocado");
    }

    private void logAccessAction(String action, String status) {
        new Thread(() -> {
            try {
                String logId = "access_" + System.currentTimeMillis();
                
                Map<String, AttributeValue> item = Map.of(
                    "log_id", new AttributeValue(logId),
                    "tenant_id", new AttributeValue(getCurrentTenantId()),
                    "user_id", new AttributeValue(getCurrentUserId()),
                    "user_name", new AttributeValue(getCurrentUserName()),
                    "action", new AttributeValue(action),
                    "location", new AttributeValue("Mobile App"),
                    "timestamp", new AttributeValue(String.valueOf(System.currentTimeMillis())),
                    "status", new AttributeValue(status)
                );
                
                PutItemRequest putItemRequest = new PutItemRequest()
                    .withTableName("CondoconnectAI-AccessLogs")
                    .withItem(item);
                
                dynamoDBClient.putItem(putItemRequest);
                
                runOnUiThread(() -> loadAccessLogs());
                
            } catch (Exception e) {
                Log.e(TAG, "Error logging access action", e);
            }
        }).start();
    }

    private String getCurrentTenantId() {
        return getSharedPreferences("CondoconnectAI", MODE_PRIVATE).getString("tenant_id", "");
    }

    private String getCurrentUserId() {
        return getSharedPreferences("CondoconnectAI", MODE_PRIVATE).getString("user_id", "");
    }

    private String getCurrentUserName() {
        return getSharedPreferences("CondoconnectAI", MODE_PRIVATE).getString("user_name", "");
    }

    private void showError(String message) {
        Toast.makeText(this, message, Toast.LENGTH_LONG).show();
    }

    private void showSuccess(String message) {
        Toast.makeText(this, message, Toast.LENGTH_SHORT).show();
    }
}

// ============= TICKET ACTIVITY =============
class TicketActivity extends AppCompatActivity {
    private static final String TAG = "TicketActivity";
    private Button createTicketButton;
    private RecyclerView ticketsRecycler;
    private Spinner statusFilterSpinner;
    private TicketAdapter ticketAdapter;
    private AmazonDynamoDBClient dynamoDBClient;
    private List<Ticket> tickets;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_ticket);
        
        initializeViews();
        setupRecyclerView();
        setupFilters();
        loadTickets();
    }

    private void initializeViews() {
        createTicketButton = findViewById(R.id.createTicketButton);
        ticketsRecycler = findViewById(R.id.ticketsRecycler);
        statusFilterSpinner = findViewById(R.id.statusFilterSpinner);
        
        createTicketButton.setOnClickListener(v -> createTicket());
    }

    private void setupRecyclerView() {
        tickets = new ArrayList<>();
        ticketAdapter = new TicketAdapter(tickets, this::onTicketClick);
        ticketsRecycler.setLayoutManager(new LinearLayoutManager(this));
        ticketsRecycler.setAdapter(ticketAdapter);
    }

    private void setupFilters() {
        String[] statusOptions = {"Todos", "Abierto", "En Progreso", "Resuelto", "Cerrado"};
        ArrayAdapter<String> adapter = new ArrayAdapter<>(this, android.R.layout.simple_spinner_item, statusOptions);
        adapter.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item);
        statusFilterSpinner.setAdapter(adapter);
        
        statusFilterSpinner.setOnItemSelectedListener(new AdapterView.OnItemSelectedListener() {
            @Override
            public void onItemSelected(AdapterView<?> parent, View view, int position, long id) {
                filterTickets();
            }
            
            @Override
            public void onNothingSelected(AdapterView<?> parent) {}
        });
    }

    private void loadTickets() {
        new Thread(() -> {
            try {
                String userId = getCurrentUserId();
                
                QueryRequest queryRequest = new QueryRequest()
                    .withTableName("CondoconnectAI-Tickets")
                    .withIndexName("UserIndex")
                    .withKeyConditionExpression("user_id = :userId")
                    .withExpressionAttributeValues(Map.of(":userId", new AttributeValue(userId)))
                    .withScanIndexForward(false);
                
                QueryResult result = dynamoDBClient.query(queryRequest);
                List<Ticket> loadedTickets = new ArrayList<>();
                
                for (Map<String, AttributeValue> item : result.getItems()) {
                    Ticket ticket = new Ticket();
                    ticket.setId(item.get("ticket_id").getS());
                    ticket.setTitle(item.get("title").getS());
                    ticket.setDescription(item.get("description").getS());
                    ticket.setStatus(item.get("status").getS());
                    ticket.setPriority(item.get("priority").getS());
                    ticket.setCategory(item.get("category").getS());
                    ticket.setCreatedAt(item.get("created_at").getS());
                    loadedTickets.add(ticket);
                }
                
                runOnUiThread(() -> {
                    tickets.clear();
                    tickets.addAll(loadedTickets);
                    ticketAdapter.notifyDataSetChanged();
                });
                
            } catch (Exception e) {
                Log.e(TAG, "Error loading tickets", e);
            }
        }).start();
    }

    private void filterTickets() {
        String selectedStatus = statusFilterSpinner.getSelectedItem().toString();
        
        List<Ticket> filteredList = new ArrayList<>();
        for (Ticket ticket : tickets) {
            if (selectedStatus.equals("Todos") || ticket.getStatus().equalsIgnoreCase(selectedStatus)) {
                filteredList.add(ticket);
            }
        }
        
        ticketAdapter.updateList(filteredList);
    }

    private void createTicket() {
        CreateTicketDialog dialog = new CreateTicketDialog(this, this::onTicketCreated);
        dialog.show();
    }

    private void onTicketCreated(Ticket newTicket) {
        new Thread(() -> {
            try {
                String ticketId = "ticket_" + System.currentTimeMillis();
                newTicket.setId(ticketId);
                
                Map<String, AttributeValue> item = Map.of(
                    "ticket_id", new AttributeValue(ticketId),
                    "user_id", new AttributeValue(getCurrentUserId()),
                    "tenant_id", new AttributeValue(getCurrentTenantId()),
                    "title", new AttributeValue(newTicket.getTitle()),
                    "description", new AttributeValue(newTicket.getDescription()),
                    "status", new AttributeValue("open"),
                    "priority", new AttributeValue(newTicket.getPriority()),
                    "category", new AttributeValue(newTicket.getCategory()),
                    "created_at", new AttributeValue(String.valueOf(System.currentTimeMillis()))
                );
                
                PutItemRequest putItemRequest = new PutItemRequest()
                    .withTableName("CondoconnectAI-Tickets")
                    .withItem(item);
                
                dynamoDBClient.putItem(putItemRequest);
                
                runOnUiThread(() -> {
                    tickets.add(0, newTicket);
                    ticketAdapter.notifyItemInserted(0);
                    showSuccess("Ticket creado exitosamente");
                });
                
            } catch (Exception e) {
                Log.e(TAG, "Error creating ticket", e);
                runOnUiThread(() -> showError("Error creando ticket"));
            }
        }).start();
    }

    private void onTicketClick(Ticket ticket) {
        TicketDetailDialog dialog = new TicketDetailDialog(this, ticket);
        dialog.show();
    }

    private String getCurrentUserId() {
        return getSharedPreferences("CondoconnectAI", MODE_PRIVATE).getString("user_id", "");
    }

    private String getCurrentTenantId() {
        return getSharedPreferences("CondoconnectAI", MODE_PRIVATE).getString("tenant_id", "");
    }

    private void showError(String message) {
        Toast.makeText(this, message, Toast.LENGTH_LONG).show();
    }

    private void showSuccess(String message) {
        Toast.makeText(this, message, Toast.LENGTH_SHORT).show();
    }
}

// ============= CONFIGURATION ACTIVITY =============
class ConfigurationActivity extends AppCompatActivity {
    private static final String TAG = "ConfigurationActivity";
    private Switch notificationsSwitch;
    private Switch biometricSwitch;
    private Switch locationSwitch;
    private Spinner languageSpinner;
    private Spinner themeSpinner;
    private Button saveSettingsButton;
    private Button resetSettingsButton;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_configuration);
        
        initializeViews();
        loadCurrentSettings();
    }

    private void initializeViews() {
        notificationsSwitch = findViewById(R.id.notificationsSwitch);
        biometricSwitch = findViewById(R.id.biometricSwitch);
        locationSwitch = findViewById(R.id.locationSwitch);
        languageSpinner = findViewById(R.id.languageSpinner);
        themeSpinner = findViewById(R.id.themeSpinner);
        saveSettingsButton = findViewById(R.id.saveSettingsButton);
        resetSettingsButton = findViewById(R.id.resetSettingsButton);
        
        setupSpinners();
        saveSettingsButton.setOnClickListener(v -> saveSettings());
        resetSettingsButton.setOnClickListener(v -> resetSettings());
    }

    private void setupSpinners() {
        // Language Spinner
        String[] languages = {"Español", "English", "Português"};
        ArrayAdapter<String> languageAdapter = new ArrayAdapter<>(this, android.R.layout.simple_spinner_item, languages);
        languageAdapter.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item);
        languageSpinner.setAdapter(languageAdapter);
        
        // Theme Spinner
        String[] themes = {"Claro", "Oscuro", "Automático"};
        ArrayAdapter<String> themeAdapter = new ArrayAdapter<>(this, android.R.layout.simple_spinner_item, themes);
        themeAdapter.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item);
        themeSpinner.setAdapter(themeAdapter);
    }

    private void loadCurrentSettings() {
        SharedPreferences prefs = getSharedPreferences("CondoconnectAI", MODE_PRIVATE);
        
        notificationsSwitch.setChecked(prefs.getBoolean("notifications_enabled", true));
        biometricSwitch.setChecked(prefs.getBoolean("biometric_enabled", false));
        locationSwitch.setChecked(prefs.getBoolean("location_enabled", false));
        
        String language = prefs.getString("language", "Español");
        String theme = prefs.getString("theme", "Claro");
        
        setSpinnerSelection(languageSpinner, language);
        setSpinnerSelection(themeSpinner, theme);
    }

    private void setSpinnerSelection(Spinner spinner, String value) {
        ArrayAdapter<String> adapter = (ArrayAdapter<String>) spinner.getAdapter();
        int position = adapter.getPosition(value);
        if (position >= 0) {
            spinner.setSelection(position);
        }
    }

    private void saveSettings() {
        SharedPreferences.Editor editor = getSharedPreferences("CondoconnectAI", MODE_PRIVATE).edit();
        
        editor.putBoolean("notifications_enabled", notificationsSwitch.isChecked());
        editor.putBoolean("biometric_enabled", biometricSwitch.isChecked());
        editor.putBoolean("location_enabled", locationSwitch.isChecked());
        editor.putString("language", languageSpinner.getSelectedItem().toString());
        editor.putString("theme", themeSpinner.getSelectedItem().toString());
        
        editor.apply();
        
        showSuccess("Configuración guardada exitosamente");
    }

    private void resetSettings() {
        SharedPreferences.Editor editor = getSharedPreferences("CondoconnectAI", MODE_PRIVATE).edit();
        editor.clear();
        editor.apply();
        
        loadCurrentSettings();
        showSuccess("Configuración restablecida a valores por defecto");
    }

    private void showSuccess(String message) {
        Toast.makeText(this, message, Toast.LENGTH_SHORT).show();
    }
}

// ============= NOTIFICATION ACTIVITY =============
class NotificationActivity extends AppCompatActivity {
    private static final String TAG = "NotificationActivity";
    private RecyclerView notificationsRecycler;
    private Button markAllReadButton;
    private Button clearAllButton;
    private NotificationAdapter notificationAdapter;
    private AmazonDynamoDBClient dynamoDBClient;
    private List<Notification> notifications;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_notification);
        
        initializeViews();
        setupRecyclerView();
        loadNotifications();
    }

    private void initializeViews() {
        notificationsRecycler = findViewById(R.id.notificationsRecycler);
        markAllReadButton = findViewById(R.id.markAllReadButton);
        clearAllButton = findViewById(R.id.clearAllButton);
        
        markAllReadButton.setOnClickListener(v -> markAllAsRead());
        clearAllButton.setOnClickListener(v -> clearAllNotifications());
    }

    private void setupRecyclerView() {
        notifications = new ArrayList<>();
        notificationAdapter = new NotificationAdapter(notifications, this::onNotificationClick);
        notificationsRecycler.setLayoutManager(new LinearLayoutManager(this));
        notificationsRecycler.setAdapter(notificationAdapter);
    }

    private void loadNotifications() {
        new Thread(() -> {
            try {
                String userId = getCurrentUserId();
                
                QueryRequest queryRequest = new QueryRequest()
                    .withTableName("CondoconnectAI-Notifications")
                    .withIndexName("UserIndex")
                    .withKeyConditionExpression("user_id = :userId")
                    .withExpressionAttributeValues(Map.of(":userId", new AttributeValue(userId)))
                    .withScanIndexForward(false)
                    .withLimit(100);
                
                QueryResult result = dynamoDBClient.query(queryRequest);
                List<Notification> loadedNotifications = new ArrayList<>();
                
                for (Map<String, AttributeValue> item : result.getItems()) {
                    Notification notification = new Notification();
                    notification.setId(item.get("notification_id").getS());
                    notification.setTitle(item.get("title").getS());
                    notification.setMessage(item.get("message").getS());
                    notification.setType(item.get("type").getS());
                    notification.setTimestamp(item.get("timestamp").getS());
                    notification.setRead(Boolean.parseBoolean(item.get("is_read").getS()));
                    loadedNotifications.add(notification);
                }
                
                runOnUiThread(() -> {
                    notifications.clear();
                    notifications.addAll(loadedNotifications);
                    notificationAdapter.notifyDataSetChanged();
                });
                
            } catch (Exception e) {
                Log.e(TAG, "Error loading notifications", e);
            }
        }).start();
    }

    private void markAllAsRead() {
        new Thread(() -> {
            try {
                for (Notification notification : notifications) {
                    if (!notification.isRead()) {
                        UpdateItemRequest updateRequest = new UpdateItemRequest()
                            .withTableName("CondoconnectAI-Notifications")
                            .withKey(Map.of("notification_id", new AttributeValue(notification.getId())))
                            .withUpdateExpression("SET is_read = :read")
                            .withExpressionAttributeValues(Map.of(":read", new AttributeValue("true")));
                        
                        dynamoDBClient.updateItem(updateRequest);
                        notification.setRead(true);
                    }
                }
                
                runOnUiThread(() -> {
                    notificationAdapter.notifyDataSetChanged();
                    showSuccess("Todas las notificaciones marcadas como leídas");
                });
                
            } catch (Exception e) {
                Log.e(TAG, "Error marking notifications as read", e);
            }
        }).start();
    }

    private void clearAllNotifications() {
        new Thread(() -> {
            try {
                for (Notification notification : notifications) {
                    DeleteItemRequest deleteRequest = new DeleteItemRequest()
                        .withTableName("CondoconnectAI-Notifications")
                        .withKey(Map.of("notification_id", new AttributeValue(notification.getId())));
                    
                    dynamoDBClient.deleteItem(deleteRequest);
                }
                
                runOnUiThread(() -> {
                    notifications.clear();
                    notificationAdapter.notifyDataSetChanged();
                    showSuccess("Todas las notificaciones eliminadas");
                });
                
            } catch (Exception e) {
                Log.e(TAG, "Error clearing notifications", e);
            }
        }).start();
    }

    private void onNotificationClick(Notification notification) {
        if (!notification.isRead()) {
            markNotificationAsRead(notification);
        }
        
        NotificationDetailDialog dialog = new NotificationDetailDialog(this, notification);
        dialog.show();
    }

    private void markNotificationAsRead(Notification notification) {
        new Thread(() -> {
            try {
                UpdateItemRequest updateRequest = new UpdateItemRequest()
                    .withTableName("CondoconnectAI-Notifications")
                    .withKey(Map.of("notification_id", new AttributeValue(notification.getId())))
                    .withUpdateExpression("SET is_read = :read")
                    .withExpressionAttributeValues(Map.of(":read", new AttributeValue("true")));
                
                dynamoDBClient.updateItem(updateRequest);
                notification.setRead(true);
                
                runOnUiThread(() -> notificationAdapter.notifyDataSetChanged());
                
            } catch (Exception e) {
                Log.e(TAG, "Error marking notification as read", e);
            }
        }).start();
    }

    private String getCurrentUserId() {
        return getSharedPreferences("CondoconnectAI", MODE_PRIVATE).getString("user_id", "");
    }

    private void showSuccess(String message) {
        Toast.makeText(this, message, Toast.LENGTH_SHORT).show();
    }
}

// ============= OFFLINE ACTIVITY =============
class OfflineActivity extends AppCompatActivity {
    private static final String TAG = "OfflineActivity";
    private TextView offlineStatusText;
    private Button syncDataButton;
    private RecyclerView offlineDataRecycler;
    private OfflineDataAdapter offlineDataAdapter;
    private List<OfflineData> offlineDataList;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_offline);
        
        initializeViews();
        setupRecyclerView();
        loadOfflineData();
        checkConnectivity();
    }

    private void initializeViews() {
        offlineStatusText = findViewById(R.id.offlineStatusText);
        syncDataButton = findViewById(R.id.syncDataButton);
        offlineDataRecycler = findViewById(R.id.offlineDataRecycler);
        
        syncDataButton.setOnClickListener(v -> syncOfflineData());
    }

    private void setupRecyclerView() {
        offlineDataList = new ArrayList<>();
        offlineDataAdapter = new OfflineDataAdapter(offlineDataList);
        offlineDataRecycler.setLayoutManager(new LinearLayoutManager(this));
        offlineDataRecycler.setAdapter(offlineDataAdapter);
    }

    private void loadOfflineData() {
        // Cargar datos almacenados localmente
        SharedPreferences prefs = getSharedPreferences("OfflineData", MODE_PRIVATE);
        Map<String, ?> allData = prefs.getAll();
        
        offlineDataList.clear();
        for (Map.Entry<String, ?> entry : allData.entrySet()) {
            OfflineData data = new OfflineData();
            data.setKey(entry.getKey());
            data.setValue(entry.getValue().toString());
            data.setTimestamp(System.currentTimeMillis());
            offlineDataList.add(data);
        }
        
        offlineDataAdapter.notifyDataSetChanged();
        updateOfflineStatus();
    }

    private void checkConnectivity() {
        ConnectivityManager cm = (ConnectivityManager) getSystemService(Context.CONNECTIVITY_SERVICE);
        NetworkInfo activeNetwork = cm.getActiveNetworkInfo();
        boolean isConnected = activeNetwork != null && activeNetwork.isConnectedOrConnecting();
        
        syncDataButton.setEnabled(isConnected);
        
        if (isConnected) {
            offlineStatusText.setText("Estado: Conectado - Datos sincronizados");
            offlineStatusText.setTextColor(getColor(android.R.color.holo_green_dark));
        } else {
            offlineStatusText.setText("Estado: Sin conexión - Modo offline");
            offlineStatusText.setTextColor(getColor(android.R.color.holo_red_dark));
        }
    }

    private void syncOfflineData() {
        new Thread(() -> {
            try {
                // Simular sincronización de datos offline
                Thread.sleep(2000);
                
                runOnUiThread(() -> {
                    showSuccess("Datos sincronizados exitosamente");
                    checkConnectivity();
                });
                
            } catch (Exception e) {
                Log.e(TAG, "Error syncing offline data", e);
                runOnUiThread(() -> showError("Error sincronizando datos"));
            }
        }).start();
    }

    private void updateOfflineStatus() {
        if (offlineDataList.isEmpty()) {
            offlineStatusText.setText("No hay datos offline almacenados");
        } else {
            offlineStatusText.setText("Datos offline: " + offlineDataList.size() + " elementos");
        }
    }

    private void showError(String message) {
        Toast.makeText(this, message, Toast.LENGTH_LONG).show();
    }

    private void showSuccess(String message) {
        Toast.makeText(this, message, Toast.LENGTH_SHORT).show();
    }
}
