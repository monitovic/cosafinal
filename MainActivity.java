package com.condoconnectai;

import android.os.Bundle;
import android.util.Log;
import androidx.appcompat.app.AppCompatActivity;
import com.amazonaws.mobile.client.AWSMobileClient;
import com.amazonaws.mobile.client.Callback;
import com.amazonaws.mobile.client.UserStateDetails;
import com.amazonaws.mobile.config.AWSConfiguration;
import com.amazonaws.services.dynamodbv2.AmazonDynamoDBClient;
import com.amazonaws.services.s3.AmazonS3Client;
import com.amazonaws.auth.CognitoCachingCredentialsProvider;
import com.amazonaws.regions.Regions;

public class MainActivity extends AppCompatActivity {
    private static final String TAG = "CondoconnectAI";
    private AmazonDynamoDBClient dynamoDBClient;
    private AmazonS3Client s3Client;
    private CognitoCachingCredentialsProvider credentialsProvider;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);
        
        initializeAWS();
        setupHybridBridge();
        initializeOfflineSync();
    }

    private void initializeAWS() {
        AWSMobileClient.getInstance().initialize(getApplicationContext(), new Callback<UserStateDetails>() {
            @Override
            public void onResult(UserStateDetails userStateDetails) {
                Log.i(TAG, "AWSMobileClient initialized. User State: " + userStateDetails.getUserState());
                
                // Configurar credenciales
                credentialsProvider = new CognitoCachingCredentialsProvider(
                    getApplicationContext(),
                    "us-east-1:12345678-1234-1234-1234-123456789012", // Identity Pool ID
                    Regions.US_EAST_1
                );
                
                // Inicializar clientes AWS
                dynamoDBClient = new AmazonDynamoDBClient(credentialsProvider);
                dynamoDBClient.setRegion(com.amazonaws.regions.Region.getRegion(Regions.US_EAST_1));
                
                s3Client = new AmazonS3Client(credentialsProvider);
                s3Client.setRegion(com.amazonaws.regions.Region.getRegion(Regions.US_EAST_1));
                
                // Configurar servicios adicionales
                setupPushNotifications();
                setupBiometricAuth();
                setupOfflineStorage();
            }

            @Override
            public void onError(Exception e) {
                Log.e(TAG, "Initialization error.", e);
            }
        });
    }

    private void setupHybridBridge() {
        // Configurar puente híbrido para comunicación web-nativo
        HybridBridge bridge = new HybridBridge(this);
        bridge.initialize();
        
        // Registrar handlers para funciones nativas
        bridge.registerHandler("biometric", new BiometricHandler());
        bridge.registerHandler("camera", new CameraHandler());
        bridge.registerHandler("storage", new StorageHandler());
        bridge.registerHandler("notification", new NotificationHandler());
    }

    private void initializeOfflineSync() {
        OfflineSyncManager syncManager = new OfflineSyncManager(dynamoDBClient);
        syncManager.enableAutoSync(true);
        syncManager.setSyncInterval(300000); // 5 minutos
        
        // Configurar tablas para sincronización offline
        syncManager.addTable("CondoconnectAI-Residents");
        syncManager.addTable("CondoconnectAI-Payments");
        syncManager.addTable("CondoconnectAI-Maintenance");
        syncManager.addTable("CondoconnectAI-Communications");
    }

    private void setupPushNotifications() {
        // Configurar Amazon Pinpoint para notificaciones push
        PinpointManager pinpointManager = new PinpointManager(this);
        pinpointManager.initialize();
        pinpointManager.registerForPushNotifications();
    }

    private void setupBiometricAuth() {
        BiometricManager biometricManager = new BiometricManager(this);
        if (biometricManager.isAvailable()) {
            biometricManager.initialize();
        }
    }

    private void setupOfflineStorage() {
        OfflineStorageManager storageManager = new OfflineStorageManager(this);
        storageManager.initialize();
        storageManager.setEncryptionEnabled(true);
    }

    @Override
    protected void onResume() {
        super.onResume();
        // Sincronizar datos cuando la app vuelve al foreground
        syncDataWithAWS();
    }

    private void syncDataWithAWS() {
        // Implementar lógica de sincronización
        new Thread(() -> {
            try {
                // Sincronizar datos locales con DynamoDB
                OfflineSyncManager.getInstance().performSync();
                
                // Actualizar caché de S3
                S3CacheManager.getInstance().refreshCache();
                
                // Procesar notificaciones pendientes
                NotificationManager.getInstance().processPendingNotifications();
                
            } catch (Exception e) {
                Log.e(TAG, "Error during sync", e);
            }
        }).start();
    }
}
