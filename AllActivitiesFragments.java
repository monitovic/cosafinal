// ============= MAIN ACTIVITY =============
package com.condoconnectai.activities;

import android.content.Intent;
import android.os.Bundle;
import android.view.MenuItem;
import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;
import androidx.fragment.app.Fragment;
import androidx.fragment.app.FragmentManager;
import androidx.fragment.app.FragmentTransaction;
import com.google.android.material.bottomnavigation.BottomNavigationView;
import com.condoconnectai.R;
import com.condoconnectai.fragments.*;
import com.condoconnectai.utils.AuthManager;
import com.condoconnectai.utils.NetworkUtils;

public class MainActivity extends AppCompatActivity implements BottomNavigationView.OnNavigationItemSelectedListener {
    
    private BottomNavigationView bottomNavigationView;
    private FragmentManager fragmentManager;
    private AuthManager authManager;
    
    // Fragment instances
    private DashboardFragment dashboardFragment;
    private ResidentsFragment residentsFragment;
    private PaymentsFragment paymentsFragment;
    private MaintenanceFragment maintenanceFragment;
    private SecurityFragment securityFragment;
    private CommunicationFragment communicationFragment;
    private ProfileFragment profileFragment;
    
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);
        
        initializeComponents();
        checkAuthentication();
        setupBottomNavigation();
        
        // Load default fragment
        if (savedInstanceState == null) {
            loadFragment(new DashboardFragment(), "dashboard");
        }
    }
    
    private void initializeComponents() {
        bottomNavigationView = findViewById(R.id.bottom_navigation);
        fragmentManager = getSupportFragmentManager();
        authManager = AuthManager.getInstance(this);
    }
    
    private void checkAuthentication() {
        if (!authManager.isUserLoggedIn()) {
            Intent intent = new Intent(this, LoginActivity.class);
            startActivity(intent);
            finish();
            return;
        }
        
        // Check network connectivity
        if (!NetworkUtils.isNetworkAvailable(this)) {
            // Show offline mode or retry dialog
            showNetworkErrorDialog();
        }
    }
    
    private void setupBottomNavigation() {
        bottomNavigationView.setOnNavigationItemSelectedListener(this);
        bottomNavigationView.setSelectedItemId(R.id.nav_dashboard);
    }
    
    @Override
    public boolean onNavigationItemSelected(@NonNull MenuItem item) {
        Fragment selectedFragment = null;
        String tag = "";
        
        switch (item.getItemId()) {
            case R.id.nav_dashboard:
                if (dashboardFragment == null) {
                    dashboardFragment = new DashboardFragment();
                }
                selectedFragment = dashboardFragment;
                tag = "dashboard";
                break;
                
            case R.id.nav_residents:
                if (residentsFragment == null) {
                    residentsFragment = new ResidentsFragment();
                }
                selectedFragment = residentsFragment;
                tag = "residents";
                break;
                
            case R.id.nav_payments:
                if (paymentsFragment == null) {
                    paymentsFragment = new PaymentsFragment();
                }
                selectedFragment = paymentsFragment;
                tag = "payments";
                break;
                
            case R.id.nav_maintenance:
                if (maintenanceFragment == null) {
                    maintenanceFragment = new MaintenanceFragment();
                }
                selectedFragment = maintenanceFragment;
                tag = "maintenance";
                break;
                
            case R.id.nav_security:
                if (securityFragment == null) {
                    securityFragment = new SecurityFragment();
                }
                selectedFragment = securityFragment;
                tag = "security";
                break;
                
            case R.id.nav_communication:
                if (communicationFragment == null) {
                    communicationFragment = new CommunicationFragment();
                }
                selectedFragment = communicationFragment;
                tag = "communication";
                break;
                
            case R.id.nav_profile:
                if (profileFragment == null) {
                    profileFragment = new ProfileFragment();
                }
                selectedFragment = profileFragment;
                tag = "profile";
                break;
        }
        
        if (selectedFragment != null) {
            loadFragment(selectedFragment, tag);
            return true;
        }
        
        return false;
    }
    
    private void loadFragment(Fragment fragment, String tag) {
        FragmentTransaction transaction = fragmentManager.beginTransaction();
        
        // Hide all fragments first
        hideAllFragments(transaction);
        
        // Check if fragment is already added
        Fragment existingFragment = fragmentManager.findFragmentByTag(tag);
        if (existingFragment != null) {
            transaction.show(existingFragment);
        } else {
            transaction.add(R.id.fragment_container, fragment, tag);
        }
        
        transaction.commit();
    }
    
    private void hideAllFragments(FragmentTransaction transaction) {
        if (dashboardFragment != null) transaction.hide(dashboardFragment);
        if (residentsFragment != null) transaction.hide(residentsFragment);
        if (paymentsFragment != null) transaction.hide(paymentsFragment);
        if (maintenanceFragment != null) transaction.hide(maintenanceFragment);
        if (securityFragment != null) transaction.hide(securityFragment);
        if (communicationFragment != null) transaction.hide(communicationFragment);
        if (profileFragment != null) transaction.hide(profileFragment);
    }
    
    private void showNetworkErrorDialog() {
        // Implementation for network error dialog
    }
    
    @Override
    protected void onResume() {
        super.onResume();
        // Refresh current fragment if needed
        Fragment currentFragment = getCurrentFragment();
        if (currentFragment instanceof RefreshableFragment) {
            ((RefreshableFragment) currentFragment).refreshData();
        }
    }
    
    private Fragment getCurrentFragment() {
        int selectedItemId = bottomNavigationView.getSelectedItemId();
        switch (selectedItemId) {
            case R.id.nav_dashboard: return dashboardFragment;
            case R.id.nav_residents: return residentsFragment;
            case R.id.nav_payments: return paymentsFragment;
            case R.id.nav_maintenance: return maintenanceFragment;
            case R.id.nav_security: return securityFragment;
            case R.id.nav_communication: return communicationFragment;
            case R.id.nav_profile: return profileFragment;
            default: return null;
        }
    }
    
    @Override
    public void onBackPressed() {
        Fragment currentFragment = getCurrentFragment();
        if (currentFragment instanceof BackPressHandler) {
            if (((BackPressHandler) currentFragment).onBackPressed()) {
                return; // Fragment handled the back press
            }
        }
        
        // If we're not on dashboard, go to dashboard
        if (bottomNavigationView.getSelectedItemId() != R.id.nav_dashboard) {
            bottomNavigationView.setSelectedItemId(R.id.nav_dashboard);
        } else {
            super.onBackPressed();
        }
    }
}

// ============= LOGIN ACTIVITY =============
package com.condoconnectai.activities;

import android.content.Intent;
import android.os.Bundle;
import android.text.TextUtils;
import android.view.View;
import android.widget.Button;
import android.widget.EditText;
import android.widget.ProgressBar;
import android.widget.TextView;
import androidx.appcompat.app.AppCompatActivity;
import com.google.android.material.snackbar.Snackbar;
import com.condoconnectai.R;
import com.condoconnectai.utils.AuthManager;
import com.condoconnectai.utils.ValidationUtils;
import com.condoconnectai.models.User;

public class LoginActivity extends AppCompatActivity {
    
    private EditText emailEditText;
    private EditText passwordEditText;
    private Button loginButton;
    private Button registerButton;
    private TextView forgotPasswordText;
    private ProgressBar progressBar;
    private View loginForm;
    
    private AuthManager authManager;
    
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_login);
        
        initializeViews();
        setupClickListeners();
        
        authManager = AuthManager.getInstance(this);
        
        // Check if user is already logged in
        if (authManager.isUserLoggedIn()) {
            navigateToMain();
        }
    }
    
    private void initializeViews() {
        emailEditText = findViewById(R.id.email_edit_text);
        passwordEditText = findViewById(R.id.password_edit_text);
        loginButton = findViewById(R.id.login_button);
        registerButton = findViewById(R.id.register_button);
        forgotPasswordText = findViewById(R.id.forgot_password_text);
        progressBar = findViewById(R.id.progress_bar);
        loginForm = findViewById(R.id.login_form);
    }
    
    private void setupClickListeners() {
        loginButton.setOnClickListener(v -> attemptLogin());
        registerButton.setOnClickListener(v -> navigateToRegister());
        forgotPasswordText.setOnClickListener(v -> navigateToForgotPassword());
    }
    
    private void attemptLogin() {
        // Reset errors
        emailEditText.setError(null);
        passwordEditText.setError(null);
        
        String email = emailEditText.getText().toString().trim();
        String password = passwordEditText.getText().toString();
        
        boolean cancel = false;
        View focusView = null;
        
        // Check for valid password
        if (TextUtils.isEmpty(password)) {
            passwordEditText.setError(getString(R.string.error_field_required));
            focusView = passwordEditText;
            cancel = true;
        } else if (!ValidationUtils.isPasswordValid(password)) {
            passwordEditText.setError(getString(R.string.error_invalid_password));
            focusView = passwordEditText;
            cancel = true;
        }
        
        // Check for valid email
        if (TextUtils.isEmpty(email)) {
            emailEditText.setError(getString(R.string.error_field_required));
            focusView = emailEditText;
            cancel = true;
        } else if (!ValidationUtils.isEmailValid(email)) {
            emailEditText.setError(getString(R.string.error_invalid_email));
            focusView = emailEditText;
            cancel = true;
        }
        
        if (cancel) {
            focusView.requestFocus();
        } else {
            showProgress(true);
            performLogin(email, password);
        }
    }
    
    private void performLogin(String email, String password) {
        authManager.signIn(email, password, new AuthManager.AuthCallback() {
            @Override
            public void onSuccess(User user) {
                runOnUiThread(() -> {
                    showProgress(false);
                    navigateToMain();
                });
            }
            
            @Override
            public void onError(String error) {
                runOnUiThread(() -> {
                    showProgress(false);
                    showError(error);
                });
            }
        });
    }
    
    private void showProgress(boolean show) {
        progressBar.setVisibility(show ? View.VISIBLE : View.GONE);
        loginForm.setVisibility(show ? View.GONE : View.VISIBLE);
    }
    
    private void showError(String error) {
        Snackbar.make(loginForm, error, Snackbar.LENGTH_LONG).show();
    }
    
    private void navigateToMain() {
        Intent intent = new Intent(this, MainActivity.class);
        startActivity(intent);
        finish();
    }
    
    private void navigateToRegister() {
        Intent intent = new Intent(this, RegisterActivity.class);
        startActivity(intent);
    }
    
    private void navigateToForgotPassword() {
        Intent intent = new Intent(this, ForgotPasswordActivity.class);
        startActivity(intent);
    }
}

// ============= DASHBOARD FRAGMENT =============
package com.condoconnectai.fragments;

import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.TextView;
import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.fragment.app.Fragment;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout;
import com.condoconnectai.R;
import com.condoconnectai.adapters.DashboardStatsAdapter;
import com.condoconnectai.adapters.RecentActivitiesAdapter;
import com.condoconnectai.models.DashboardStats;
import com.condoconnectai.models.Activity;
import com.condoconnectai.services.ApiService;
import com.condoconnectai.utils.AuthManager;
import java.util.List;

public class DashboardFragment extends Fragment implements RefreshableFragment {
    
    private SwipeRefreshLayout swipeRefreshLayout;
    private RecyclerView statsRecyclerView;
    private RecyclerView activitiesRecyclerView;
    private TextView welcomeText;
    private TextView lastUpdateText;
    
    private DashboardStatsAdapter statsAdapter;
    private RecentActivitiesAdapter activitiesAdapter;
    private ApiService apiService;
    private AuthManager authManager;
    
    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, @Nullable ViewGroup container, @Nullable Bundle savedInstanceState) {
        View view = inflater.inflate(R.layout.fragment_dashboard, container, false);
        
        initializeViews(view);
        setupRecyclerViews();
        setupSwipeRefresh();
        
        apiService = ApiService.getInstance(getContext());
        authManager = AuthManager.getInstance(getContext());
        
        loadDashboardData();
        
        return view;
    }
    
    private void initializeViews(View view) {
        swipeRefreshLayout = view.findViewById(R.id.swipe_refresh_layout);
        statsRecyclerView = view.findViewById(R.id.stats_recycler_view);
        activitiesRecyclerView = view.findViewById(R.id.activities_recycler_view);
        welcomeText = view.findViewById(R.id.welcome_text);
        lastUpdateText = view.findViewById(R.id.last_update_text);
        
        // Set welcome message
        String userName = authManager.getCurrentUser().getName();
        welcomeText.setText(getString(R.string.welcome_message, userName));
    }
    
    private void setupRecyclerViews() {
        // Stats RecyclerView
        statsAdapter = new DashboardStatsAdapter();
        statsRecyclerView.setLayoutManager(new LinearLayoutManager(getContext(), LinearLayoutManager.HORIZONTAL, false));
        statsRecyclerView.setAdapter(statsAdapter);
        
        // Activities RecyclerView
        activitiesAdapter = new RecentActivitiesAdapter();
        activitiesRecyclerView.setLayoutManager(new LinearLayoutManager(getContext()));
        activitiesRecyclerView.setAdapter(activitiesAdapter);
    }
    
    private void setupSwipeRefresh() {
        swipeRefreshLayout.setOnRefreshListener(this::refreshData);
        swipeRefreshLayout.setColorSchemeResources(
            R.color.colorPrimary,
            R.color.colorPrimaryDark,
            R.color.colorAccent
        );
    }
    
    private void loadDashboardData() {
        swipeRefreshLayout.setRefreshing(true);
        
        apiService.getDashboardStats(new ApiService.ApiCallback<DashboardStats>() {
            @Override
            public void onSuccess(DashboardStats stats) {
                if (getActivity() != null) {
                    getActivity().runOnUiThread(() -> {
                        statsAdapter.updateStats(stats);
                        updateLastUpdateTime();
                    });
                }
            }
            
            @Override
            public void onError(String error) {
                if (getActivity() != null) {
                    getActivity().runOnUiThread(() -> {
                        // Handle error
                        swipeRefreshLayout.setRefreshing(false);
                    });
                }
            }
        });
        
        apiService.getRecentActivities(new ApiService.ApiCallback<List<Activity>>() {
            @Override
            public void onSuccess(List<Activity> activities) {
                if (getActivity() != null) {
                    getActivity().runOnUiThread(() -> {
                        activitiesAdapter.updateActivities(activities);
                        swipeRefreshLayout.setRefreshing(false);
                    });
                }
            }
            
            @Override
            public void onError(String error) {
                if (getActivity() != null) {
                    getActivity().runOnUiThread(() -> {
                        // Handle error
                        swipeRefreshLayout.setRefreshing(false);
                    });
                }
            }
        });
    }
    
    @Override
    public void refreshData() {
        loadDashboardData();
    }
    
    private void updateLastUpdateTime() {
        String currentTime = java.text.DateFormat.getTimeInstance().format(new java.util.Date());
        lastUpdateText.setText(getString(R.string.last_update, currentTime));
    }
}

// ============= RESIDENTS FRAGMENT =============
package com.condoconnectai.fragments;

import android.content.Intent;
import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.SearchView;
import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.fragment.app.Fragment;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout;
import com.google.android.material.floatingactionbutton.FloatingActionButton;
import com.condoconnectai.R;
import com.condoconnectai.activities.AddResidentActivity;
import com.condoconnectai.activities.ResidentDetailActivity;
import com.condoconnectai.adapters.ResidentsAdapter;
import com.condoconnectai.models.Resident;
import com.condoconnectai.services.ApiService;
import java.util.List;
import java.util.ArrayList;

public class ResidentsFragment extends Fragment implements RefreshableFragment, BackPressHandler {
    
    private SwipeRefreshLayout swipeRefreshLayout;
    private RecyclerView residentsRecyclerView;
    private SearchView searchView;
    private FloatingActionButton addResidentFab;
    
    private ResidentsAdapter residentsAdapter;
    private ApiService apiService;
    private List<Resident> allResidents;
    private List<Resident> filteredResidents;
    
    private static final int ADD_RESIDENT_REQUEST = 1001;
    private static final int EDIT_RESIDENT_REQUEST = 1002;
    
    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, @Nullable ViewGroup container, @Nullable Bundle savedInstanceState) {
        View view = inflater.inflate(R.layout.fragment_residents, container, false);
        
        initializeViews(view);
        setupRecyclerView();
        setupSearchView();
        setupSwipeRefresh();
        setupFab();
        
        apiService = ApiService.getInstance(getContext());
        allResidents = new ArrayList<>();
        filteredResidents = new ArrayList<>();
        
        loadResidents();
        
        return view;
    }
    
    private void initializeViews(View view) {
        swipeRefreshLayout = view.findViewById(R.id.swipe_refresh_layout);
        residentsRecyclerView = view.findViewById(R.id.residents_recycler_view);
        searchView = view.findViewById(R.id.search_view);
        addResidentFab = view.findViewById(R.id.add_resident_fab);
    }
    
    private void setupRecyclerView() {
        residentsAdapter = new ResidentsAdapter(filteredResidents);
        residentsAdapter.setOnItemClickListener(this::onResidentClick);
        
        residentsRecyclerView.setLayoutManager(new LinearLayoutManager(getContext()));
        residentsRecyclerView.setAdapter(residentsAdapter);
    }
    
    private void setupSearchView() {
        searchView.setOnQueryTextListener(new SearchView.OnQueryTextListener() {
            @Override
            public boolean onQueryTextSubmit(String query) {
                filterResidents(query);
                return true;
            }
            
            @Override
            public boolean onQueryTextChange(String newText) {
                filterResidents(newText);
                return true;
            }
        });
    }
    
    private void setupSwipeRefresh() {
        swipeRefreshLayout.setOnRefreshListener(this::refreshData);
        swipeRefreshLayout.setColorSchemeResources(
            R.color.colorPrimary,
            R.color.colorPrimaryDark,
            R.color.colorAccent
        );
    }
    
    private void setupFab() {
        addResidentFab.setOnClickListener(v -> {
            Intent intent = new Intent(getContext(), AddResidentActivity.class);
            startActivityForResult(intent, ADD_RESIDENT_REQUEST);
        });
    }
    
    private void loadResidents() {
        swipeRefreshLayout.setRefreshing(true);
        
        apiService.getResidents(new ApiService.ApiCallback<List<Resident>>() {
            @Override
            public void onSuccess(List<Resident> residents) {
                if (getActivity() != null) {
                    getActivity().runOnUiThread(() -> {
                        allResidents.clear();
                        allResidents.addAll(residents);
                        filterResidents(searchView.getQuery().toString());
                        swipeRefreshLayout.setRefreshing(false);
                    });
                }
            }
            
            @Override
            public void onError(String error) {
                if (getActivity() != null) {
                    getActivity().runOnUiThread(() -> {
                        // Handle error
                        swipeRefreshLayout.setRefreshing(false);
                    });
                }
            }
        });
    }
    
    private void filterResidents(String query) {
        filteredResidents.clear();
        
        if (query.isEmpty()) {
            filteredResidents.addAll(allResidents);
        } else {
            String lowerCaseQuery = query.toLowerCase();
            for (Resident resident : allResidents) {
                if (resident.getName().toLowerCase().contains(lowerCaseQuery) ||
                    resident.getEmail().toLowerCase().contains(lowerCaseQuery) ||
                    resident.getUnitNumber().toLowerCase().contains(lowerCaseQuery)) {
                    filteredResidents.add(resident);
                }
            }
        }
        
        residentsAdapter.notifyDataSetChanged();
    }
    
    private void onResidentClick(Resident resident) {
        Intent intent = new Intent(getContext(), ResidentDetailActivity.class);
        intent.putExtra("resident_id", resident.getId());
        startActivityForResult(intent, EDIT_RESIDENT_REQUEST);
    }
    
    @Override
    public void refreshData() {
        loadResidents();
    }
    
    @Override
    public boolean onBackPressed() {
        if (!searchView.isIconified()) {
            searchView.setIconified(true);
            return true;
        }
        return false;
    }
    
    @Override
    public void onActivityResult(int requestCode, int resultCode, @Nullable Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        
        if (resultCode == getActivity().RESULT_OK) {
            if (requestCode == ADD_RESIDENT_REQUEST || requestCode == EDIT_RESIDENT_REQUEST) {
                refreshData();
            }
        }
    }
}

// ============= INTERFACE DEFINITIONS =============
interface RefreshableFragment {
    void refreshData();
}

interface BackPressHandler {
    boolean onBackPressed();
}
