package com.condoconnectai;

import android.os.Bundle;
import android.util.Log;
import android.widget.TextView;
import androidx.appcompat.app.AppCompatActivity;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;
import com.amazonaws.services.dynamodbv2.AmazonDynamoDBClient;
import com.amazonaws.services.dynamodbv2.model.ScanRequest;
import com.amazonaws.services.dynamodbv2.model.ScanResult;
import java.util.ArrayList;
import java.util.List;

public class DashboardActivity extends AppCompatActivity {
    private static final String TAG = "DashboardActivity";
    private TextView totalResidentsText;
    private TextView monthlyRevenueText;
    private TextView pendingMaintenanceText;
    private TextView securityIncidentsText;
    private RecyclerView recentActivitiesRecycler;
    private RecyclerView pendingTasksRecycler;
    private AmazonDynamoDBClient dynamoDBClient;
    private DashboardAdapter dashboardAdapter;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_dashboard);
        
        initializeViews();
        setupRecyclerViews();
        loadDashboardData();
    }

    private void initializeViews() {
        totalResidentsText = findViewById(R.id.totalResidentsText);
        monthlyRevenueText = findViewById(R.id.monthlyRevenueText);
        pendingMaintenanceText = findViewById(R.id.pendingMaintenanceText);
        securityIncidentsText = findViewById(R.id.securityIncidentsText);
        recentActivitiesRecycler = findViewById(R.id.recentActivitiesRecycler);
        pendingTasksRecycler = findViewById(R.id.pendingTasksRecycler);
    }

    private void setupRecyclerViews() {
        recentActivitiesRecycler.setLayoutManager(new LinearLayoutManager(this));
        pendingTasksRecycler.setLayoutManager(new LinearLayoutManager(this));
        
        dashboardAdapter = new DashboardAdapter(this);
        recentActivitiesRecycler.setAdapter(dashboardAdapter);
    }

    private void loadDashboardData() {
        new Thread(() -> {
            try {
                loadResidentsCount();
                loadMonthlyRevenue();
                loadPendingMaintenance();
                loadSecurityIncidents();
                loadRecentActivities();
                loadPendingTasks();
            } catch (Exception e) {
                Log.e(TAG, "Error loading dashboard data", e);
                runOnUiThread(() -> showError("Error cargando datos del dashboard"));
            }
        }).start();
    }

    private void loadResidentsCount() {
        try {
            ScanRequest scanRequest = new ScanRequest()
                .withTableName("CondoconnectAI-Residents")
                .withFilterExpression("attribute_exists(resident_id)");
            
            ScanResult result = dynamoDBClient.scan(scanRequest);
            int count = result.getCount();
            
            runOnUiThread(() -> totalResidentsText.setText(String.valueOf(count)));
        } catch (Exception e) {
            Log.e(TAG, "Error loading residents count", e);
        }
    }

    private void loadMonthlyRevenue() {
        try {
            // Implementar lógica para calcular ingresos mensuales
            runOnUiThread(() -> monthlyRevenueText.setText("$25,000"));
        } catch (Exception e) {
            Log.e(TAG, "Error loading monthly revenue", e);
        }
    }

    private void loadPendingMaintenance() {
        try {
            ScanRequest scanRequest = new ScanRequest()
                .withTableName("CondoconnectAI-Maintenance")
                .withFilterExpression("#status = :status")
                .withExpressionAttributeNames(Map.of("#status", "status"))
                .withExpressionAttributeValues(Map.of(":status", new AttributeValue("pending")));
            
            ScanResult result = dynamoDBClient.scan(scanRequest);
            int count = result.getCount();
            
            runOnUiThread(() -> pendingMaintenanceText.setText(String.valueOf(count)));
        } catch (Exception e) {
            Log.e(TAG, "Error loading pending maintenance", e);
        }
    }

    private void loadSecurityIncidents() {
        try {
            // Implementar lógica para contar incidentes de seguridad
            runOnUiThread(() -> securityIncidentsText.setText("2"));
        } catch (Exception e) {
            Log.e(TAG, "Error loading security incidents", e);
        }
    }

    private void loadRecentActivities() {
        try {
            // Implementar lógica para cargar actividades recientes
            List<ActivityItem> activities = new ArrayList<>();
            // Agregar actividades de ejemplo
            activities.add(new ActivityItem("Nuevo residente registrado", "Hace 2 horas", "user"));
            activities.add(new ActivityItem("Pago procesado", "Hace 4 horas", "payment"));
            activities.add(new ActivityItem("Mantenimiento completado", "Hace 6 horas", "maintenance"));
            
            runOnUiThread(() -> dashboardAdapter.updateActivities(activities));
        } catch (Exception e) {
            Log.e(TAG, "Error loading recent activities", e);
        }
    }

    private void loadPendingTasks() {
        try {
            // Implementar lógica para cargar tareas pendientes
            List<TaskItem> tasks = new ArrayList<>();
            tasks.add(new TaskItem("Revisar solicitud de mantenimiento", "Alta", "2024-11-10"));
            tasks.add(new TaskItem("Aprobar nuevo residente", "Media", "2024-11-11"));
            tasks.add(new TaskItem("Generar reporte mensual", "Baja", "2024-11-12"));
            
            runOnUiThread(() -> dashboardAdapter.updateTasks(tasks));
        } catch (Exception e) {
            Log.e(TAG, "Error loading pending tasks", e);
        }
    }

    private void showError(String message) {
        // Implementar mostrar error
        Log.e(TAG, message);
    }
}
