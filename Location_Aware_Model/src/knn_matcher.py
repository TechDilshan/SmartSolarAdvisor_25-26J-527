import pandas as pd
import numpy as np
from sklearn.neighbors import NearestNeighbors

class LocationKNN:
    def __init__(self, df, k=20):
        self.df = df.copy()
        self.k = k
        self.features = ["latitude", "longitude"]

        self.nn = NearestNeighbors(
            n_neighbors=k,
            metric="haversine"
        )

        coords = np.radians(self.df[self.features])
        self.nn.fit(coords)

    def get_neighbors(self, lat, lon):
        
        query = pd.DataFrame([{
            "latitude": lat,
            "longitude": lon
        }])

        query_rad = np.radians(query[self.features])

        distances, indices = self.nn.kneighbors(query_rad)

        neighbors = self.df.iloc[indices[0]].copy()

        # Distance-based weights (closer = higher weight)
        neighbors["weight"] = 1 / (distances[0] + 1e-6)

        return neighbors
