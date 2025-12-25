import pandas as pd
import numpy as np
from models.feature_engineer import FeatureEngineer
from models.anomaly_detector import AnomalyDetector

class DataProcessor:
    """Process and prepare data for modeling"""
    
    def __init__(self):
        self.feature_engineer = FeatureEngineer()
        self.anomaly_detector = AnomalyDetector()
    
    def process_raw_data(self, df):
        """Complete data processing pipeline"""
        print("Starting data processing...")
        
        # 1. Handle missing values
        df = self.handle_missing_values(df)
        
        # 2. Detect and correct anomalies
        numeric_columns = df.select_dtypes(include=[np.number]).columns.tolist()
        df, n_anomalies = self.anomaly_detector.correct_anomalies(df, numeric_columns)
        
        # 3. Feature engineering
        df = self.feature_engineer.create_features(df)
        
        # 4. Normalize roof orientation if present
        if 'roof_orientation' in df.columns:
            df = self.normalize_orientation(df)
        
        print(f"Data processing complete. Final shape: {df.shape}")
        
        return df
    
    def handle_missing_values(self, df):
        """Handle missing values in dataset"""
        df = df.copy()
        
        # For numeric columns, fill with median
        numeric_columns = df.select_dtypes(include=[np.number]).columns
        for col in numeric_columns:
            if df[col].isnull().sum() > 0:
                df[col].fillna(df[col].median(), inplace=True)
        
        # For categorical columns, fill with mode
        categorical_columns = df.select_dtypes(include=['object']).columns
        for col in categorical_columns:
            if df[col].isnull().sum() > 0:
                df[col].fillna(df[col].mode()[0], inplace=True)
        
        return df
    
    def normalize_orientation(self, df):
        """Normalize roof orientation to standard directions"""
        df = df.copy()
        
        orientation_mapping = {
            'N': 'north', 'S': 'south', 'E': 'east', 'W': 'west',
            'NE': 'northeast', 'NW': 'northwest', 
            'SE': 'southeast', 'SW': 'southwest',
            'north': 'north', 'south': 'south', 'east': 'east', 'west': 'west',
            'northeast': 'northeast', 'northwest': 'northwest',
            'southeast': 'southeast', 'southwest': 'southwest'
        }
        
        if 'roof_orientation' in df.columns:
            df['roof_orientation'] = df['roof_orientation'].map(
                lambda x: orientation_mapping.get(str(x).upper(), 'south')
            )
        
        return df
    
    def prepare_features_target(self, df, target_column='solar_output'):
        """Separate features and target variable"""
        if target_column not in df.columns:
            raise ValueError(f"Target column '{target_column}' not found in dataset")
        
        # Remove non-feature columns
        exclude_columns = [target_column, 'date', 'id', 'location_name']
        feature_columns = [col for col in df.columns if col not in exclude_columns]
        
        X = df[feature_columns]
        y = df[target_column]
        
        # Convert categorical variables to numeric
        X = pd.get_dummies(X, columns=X.select_dtypes(include=['object']).columns.tolist())
        
        return X, y