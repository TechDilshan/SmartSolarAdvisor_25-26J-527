import numpy as np
import pandas as pd
from sklearn.neighbors import NearestNeighbors
from sklearn.preprocessing import StandardScaler
import xgboost as xgb
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_squared_error, r2_score, mean_absolute_error
import joblib

class HybridSolarModel:
    """Hybrid KNN + XGBoost model for solar prediction"""
    
    def __init__(self, n_neighbors=5, xgb_params=None):
        self.n_neighbors = n_neighbors
        self.xgb_params = xgb_params or {
            'n_estimators': 100,
            'max_depth': 6,
            'learning_rate': 0.1,
            'subsample': 0.8,
            'colsample_bytree': 0.8,
            'random_state': 42
        }
        
        self.knn = NearestNeighbors(n_neighbors=n_neighbors, metric='euclidean')
        self.xgb_model = xgb.XGBRegressor(**self.xgb_params)
        self.scaler = StandardScaler()
        
        self.location_features = ['latitude', 'longitude', 'roof_angle', 'roof_orientation']
        self.is_fitted = False
        self.feature_names = []
    
    def fit(self, X, y):
        """Train the hybrid model"""
        X = X.copy()
        
        # Store feature names
        self.feature_names = list(X.columns)
        
        # Scale features
        X_scaled = self.scaler.fit_transform(X)
        X_scaled_df = pd.DataFrame(X_scaled, columns=X.columns)
        
        # Fit KNN on location features
        location_cols = [col for col in self.location_features if col in X.columns]
        if location_cols:
            X_location = X_scaled_df[location_cols]
            self.knn.fit(X_location)
        
        # Train XGBoost
        self.xgb_model.fit(X_scaled, y)
        
        self.is_fitted = True
        
        return self
    
    def predict(self, X):
        """Make predictions using hybrid approach"""
        if not self.is_fitted:
            raise ValueError("Model must be fitted before making predictions")
        
        X = X.copy()
        
        # Ensure all features are present
        for feature in self.feature_names:
            if feature not in X.columns:
                X[feature] = 0
        
        X = X[self.feature_names]
        
        # Scale features
        X_scaled = self.scaler.transform(X)
        X_scaled_df = pd.DataFrame(X_scaled, columns=X.columns)
        
        # Get KNN weights
        location_cols = [col for col in self.location_features if col in X.columns]
        if location_cols:
            X_location = X_scaled_df[location_cols]
            distances, indices = self.knn.kneighbors(X_location)
            
            # Convert distances to weights (closer = higher weight)
            weights = 1 / (distances + 1e-10)
            weights = weights / weights.sum(axis=1, keepdims=True)
            
            # Weight features based on neighbor similarity
            weighted_factor = weights.mean(axis=1).reshape(-1, 1)
        else:
            weighted_factor = np.ones((len(X), 1))
        
        # XGBoost prediction
        xgb_predictions = self.xgb_model.predict(X_scaled)
        
        # Combine predictions (weighted by location similarity)
        final_predictions = xgb_predictions * (0.7 + 0.3 * weighted_factor.flatten())
        
        return final_predictions
    
    def evaluate(self, X, y):
        """Evaluate model performance"""
        predictions = self.predict(X)
        
        mse = mean_squared_error(y, predictions)
        rmse = np.sqrt(mse)
        mae = mean_absolute_error(y, predictions)
        r2 = r2_score(y, predictions)
        
        metrics = {
            'mse': mse,
            'rmse': rmse,
            'mae': mae,
            'r2': r2
        }
        
        return metrics, predictions
    
    def save(self, model_path, scaler_path):
        """Save model and scaler"""
        joblib.dump(self.xgb_model, model_path)
        joblib.dump(self.scaler, scaler_path)
        joblib.dump({
            'knn': self.knn,
            'feature_names': self.feature_names,
            'location_features': self.location_features,
            'n_neighbors': self.n_neighbors
        }, model_path.replace('.pkl', '_metadata.pkl'))
    
    def load(self, model_path, scaler_path):
        """Load model and scaler"""
        self.xgb_model = joblib.load(model_path)
        self.scaler = joblib.load(scaler_path)
        metadata = joblib.load(model_path.replace('.pkl', '_metadata.pkl'))
        
        self.knn = metadata['knn']
        self.feature_names = metadata['feature_names']
        self.location_features = metadata['location_features']
        self.n_neighbors = metadata['n_neighbors']
        
        self.is_fitted = True