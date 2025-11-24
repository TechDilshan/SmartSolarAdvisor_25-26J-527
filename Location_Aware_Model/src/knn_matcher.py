import numpy as np
from sklearn.neighbors import NearestNeighbors

class LocationMatcher:
    def __init__(self, df):
        self.coords = df[["latitude", "longitude"]].values
        self.nn = NearestNeighbors(n_neighbors=1).fit(self.coords)

    def match(self, lat, lon):
        dist, idx = self.nn.kneighbors([[lat, lon]])
        return idx[0][0]
