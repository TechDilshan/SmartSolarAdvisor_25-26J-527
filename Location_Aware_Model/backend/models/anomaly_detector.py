import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler

class AnomalyDetector:
    """Detect and handle anomalies in solar data"""
    
    def __init__(self, contamination=0.1):
        self.contamination = contamination
        self.model = IsolationForest(
            contamination=contamination,
            random_state=42,
            n_estimators=100
        )
        self.scaler = StandardScaler()
        self.is_fitted = False
    
    def fit(self, X):
        """Fit the anomaly detection model"""
        X_scaled = self.scaler.fit_transform(X)
        self.model.fit(X_scaled)
        self.is_fitted = True
        return self
    
    def detect(self, X):
        """Detect anomalies in data"""
        if not self.is_fitted:
            raise ValueError("Model must be fitted before detecting anomalies")
        
        X_scaled = self.scaler.transform(X)
        predictions = self.model.predict(X_scaled)
        
        # -1 for anomalies, 1 for normal
        anomalies = predictions == -1
        
        return anomalies
    
    def fit_predict(self, X):
        """Fit and predict in one step"""
        self.fit(X)
        return self.detect(X)
    
    def correct_anomalies(self, df, columns_to_check):
        """Detect and correct anomalies using interpolation"""
        df_corrected = df.copy()
        
        for column in columns_to_check:
            if column not in df.columns:
                continue
            
            # Detect anomalies
            X = df[[column]].values
            
            # Use statistical method for single column
            q1 = df[column].quantile(0.25)
            q3 = df[column].quantile(0.75)
            iqr = q3 - q1
            lower_bound = q1 - 3 * iqr
            upper_bound = q3 + 3 * iqr
            
            anomalies = (df[column] < lower_bound) | (df[column] > upper_bound)
            
            # Replace anomalies with interpolated values
            if anomalies.sum() > 0:
                df_corrected.loc[anomalies, column] = np.nan
                df_corrected[column] = df_corrected[column].interpolate(method='linear')
                
                print(f"Corrected {anomalies.sum()} anomalies in {column}")
        
        return df_corrected, anomalies.sum()